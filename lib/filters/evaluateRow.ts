import { FilterLeaf, FilterGroup, FilterSpec, Row } from "./types";
import { compareISODate, isEmptyValue, normalizeString } from "./utils";

// leaf evaluation returns:
// - true/false => actual evaluation
// - null       => leaf ignored completely (No-op) due to empty value rule
export function evalLeaf(row: Row, leaf: FilterLeaf): boolean | null {
    // Support both Notion-style (row.properties) and flat structures (e.g. Case objects)
    const cell = row.properties ? row.properties[leaf.propertyId] : (row as any)[leaf.propertyId];

    // value-less operators
    if (leaf.operator === "is_empty") {
        const s = normalizeString(cell).trim();
        return s.length === 0;
    }
    if (leaf.operator === "is_not_empty") {
        const s = normalizeString(cell).trim();
        return s.length > 0;
    }

    // IMPORTANT RULE: ignore any leaf with empty value
    if (isEmptyValue(leaf.value)) return null;

    switch (leaf.propertyType) {
        case "text":
        case "phone_number": {
            const cellStr = normalizeString(cell).toLowerCase();
            const valStr = normalizeString(leaf.value).toLowerCase();

            if (leaf.operator === "string_contains") return cellStr.includes(valStr);
            if (leaf.operator === "string_equals") return cellStr === valStr;
            if (leaf.operator === "string_starts_with") return cellStr.startsWith(valStr);
            if (leaf.operator === "string_ends_with") return cellStr.endsWith(valStr);

            return false;
        }

        case "status": {
            const cellStr = normalizeString(cell);
            const valStr = normalizeString(leaf.value);

            if (leaf.operator === "status_is") return cellStr === valStr;
            if (leaf.operator === "status_is_not") return cellStr !== valStr;

            return false;
        }

        case "date": {
            const cellStr = normalizeString(cell).trim();
            if (cellStr.length === 0) return false;

            if (leaf.operator === "date_is") return compareISODate(cellStr, String(leaf.value)) === 0;
            if (leaf.operator === "date_before") return compareISODate(cellStr, String(leaf.value)) < 0;
            if (leaf.operator === "date_after") return compareISODate(cellStr, String(leaf.value)) > 0;

            if (leaf.operator === "date_between") {
                const range = leaf.value as any;
                if (isEmptyValue(range)) return null; // ignore if incomplete
                return (
                    compareISODate(cellStr, range.start) >= 0 &&
                    compareISODate(cellStr, range.end) <= 0
                );
            }
            return false;
        }
        default:
            return true;
    }
}

export function evaluateRow(row: Row, spec: FilterSpec): boolean {
    function evalNode(node: FilterGroup | FilterLeaf): boolean | null {
        if (node.type === "property") return evalLeaf(row, node);

        const results: boolean[] = [];
        for (const child of node.filters) {
            const r = evalNode(child);
            if (r === null) continue; // ignore no-op child
            results.push(r);
        }

        // If all children were ignored => no constraints => pass through
        if (results.length === 0) return null;

        if (node.operator === "and") return results.every(Boolean);
        return results.some(Boolean);
    }

    const r = evalNode(spec);
    return r === null ? true : r;
}
