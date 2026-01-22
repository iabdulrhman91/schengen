import { FilterLeaf, FilterGroup, FilterSpec } from "./types";
import { isEmptyValue } from "./utils";

export type SQLCompilation = {
    whereSql: string; // "" means no WHERE constraints
    params: any[];
};

function quoteIdent(ident: string): string {
    // SQLite-style quoting; for other SQL dialects adjust quoting rules
    const safe = ident.replace(/"/g, '""');
    return `"${safe}"`;
}

// IMPORTANT: in real DB, propertyId usually maps to a column or JSON path.
// Here we assume columns named by propertyId for simplicity.
function propertyIdToColumn(propertyId: string): string {
    return quoteIdent(propertyId);
}

function leafToSQL(leaf: FilterLeaf, params: any[]): string | null {
    const col = propertyIdToColumn(leaf.propertyId);

    // value-less
    if (leaf.operator === "is_empty") {
        return `(${col} IS NULL OR ${col} = '')`;
    }
    if (leaf.operator === "is_not_empty") {
        return `(${col} IS NOT NULL AND ${col} <> '')`;
    }

    // ignore empty leaf
    if (isEmptyValue(leaf.value)) return null;

    switch (leaf.propertyType) {
        case "text":
        case "phone_number": {
            const v = String(leaf.value);

            if (leaf.operator === "string_contains") {
                params.push(`%${v}%`);
                return `(${col} LIKE ?)`;
            }
            if (leaf.operator === "string_equals") {
                params.push(v);
                return `(${col} = ?)`;
            }
            if (leaf.operator === "string_starts_with") {
                params.push(`${v}%`);
                return `(${col} LIKE ?)`;
            }
            if (leaf.operator === "string_ends_with") {
                params.push(`%${v}`);
                return `(${col} LIKE ?)`;
            }
            return null;
        }

        case "status": {
            const v = String(leaf.value);
            if (leaf.operator === "status_is") {
                params.push(v);
                return `(${col} = ?)`;
            }
            if (leaf.operator === "status_is_not") {
                params.push(v);
                return `(${col} <> ?)`;
            }
            return null;
        }

        case "date": {
            // assumes ISO date string comparable lexicographically
            if (leaf.operator === "date_is") {
                params.push(String(leaf.value));
                return `(${col} = ?)`;
            }
            if (leaf.operator === "date_before") {
                params.push(String(leaf.value));
                return `(${col} < ?)`;
            }
            if (leaf.operator === "date_after") {
                params.push(String(leaf.value));
                return `(${col} > ?)`;
            }
            if (leaf.operator === "date_between") {
                const r = leaf.value as any;
                if (isEmptyValue(r)) return null;
                params.push(r.start);
                params.push(r.end);
                return `(${col} BETWEEN ? AND ?)`;
            }
            return null;
        }
        default:
            return null;
    }
}

function nodeToSQL(node: FilterGroup | FilterLeaf, params: any[]): string | null {
    if (node.type === "property") return leafToSQL(node, params);

    const parts: string[] = [];
    for (const child of node.filters) {
        const childSql = nodeToSQL(child, params);
        if (!childSql) continue; // ignore no-op
        parts.push(childSql);
    }

    if (parts.length === 0) return null;

    const joiner = node.operator === "and" ? " AND " : " OR ";
    return `(${parts.join(joiner)})`;
}

export function compileToSQL(spec: FilterSpec): SQLCompilation {
    const params: any[] = [];
    const where = nodeToSQL(spec, params);

    return {
        whereSql: where ? where : "",
        params
    };
}
