export function isEmptyValue(v: any): boolean {
    if (v === null || v === undefined) return true;
    if (typeof v === "string") return v.trim().length === 0;

    if (typeof v === "object") {
        if ("start" in v || "end" in v) {
            const startEmpty = !v.start || String(v.start).trim().length === 0;
            const endEmpty = !v.end || String(v.end).trim().length === 0;
            // إذا ناقص واحد من الطرفين => نعتبره فاضي => Ignore leaf
            return startEmpty || endEmpty;
        }
    }
    return false;
}

export function normalizeString(x: any): string {
    if (x === null || x === undefined) return "";
    return String(x);
}

// ISO "YYYY-MM-DD" compare (lexicographic works)
export function compareISODate(a: string, b: string): number {
    if (!a || !b) return 0;
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}
