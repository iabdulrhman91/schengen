/* =========================
   Shared Types (Client+Server)
   ========================= */

export type NotionColor =
    | "gray" | "brown" | "orange" | "yellow" | "green"
    | "blue" | "purple" | "pink" | "red";

export type PropertyType = "text" | "phone_number" | "status" | "select" | "multi_select" | "date" | "relation";

export type PropertyBase = {
    id: string;       // stable id
    name: string;     // display name (can change)
    type: PropertyType;
    description?: string;
};

export type SelectOption = {
    id: string;
    name: string;
    color: NotionColor;
};

export type SelectProperty = PropertyBase & {
    type: "select";
    options: SelectOption[];
};

export type MultiSelectProperty = PropertyBase & {
    type: "multi_select";
    options: SelectOption[];
};

export type StatusGroupKey = "to_do" | "in_progress" | "complete" | "future" | "current";

export type StatusProperty = PropertyBase & {
    type: "status";
    groups: Record<StatusGroupKey, SelectOption[]>;
};

export type DateProperty = PropertyBase & {
    type: "date";
    config?: {
        allowRange: boolean;
        allowTime: boolean;
        defaultTimezone?: string;
    };
};

export type TextProperty = PropertyBase & { type: "text" };
export type PhoneProperty = PropertyBase & { type: "phone_number" };

export type RelationProperty = PropertyBase & {
    type: "relation";
    targetDatabaseId: string;
    twoWay?: boolean;
    inversePropertyId?: string;
};

export type Property =
    | TextProperty
    | PhoneProperty
    | StatusProperty
    | SelectProperty
    | MultiSelectProperty
    | DateProperty
    | RelationProperty;

export type DatabaseSchema = {
    databaseId: string;
    properties: Property[];
};

export type Row = {
    id: string;
    properties: Record<string /* propertyId */, any /* typed persistence */>;
};

/* =========================
   FilterSpec
   ========================= */

export type TextOp =
    | "string_contains"
    | "string_equals"
    | "string_starts_with"
    | "string_ends_with"
    | "is_empty"
    | "is_not_empty";

export type PhoneOp =
    | "string_contains"
    | "string_equals"
    | "is_empty"
    | "is_not_empty";

export type StatusOp =
    | "status_is"
    | "status_is_not"
    | "is_empty"
    | "is_not_empty";

export type DateOp =
    | "date_is"
    | "date_before"
    | "date_after"
    | "date_between"
    | "is_empty"
    | "is_not_empty";

export type FilterOperator = "and" | "or";

export type FilterLeaf = {
    type: "property";
    propertyId: string;
    propertyType: "text" | "phone_number" | "status" | "date";
    operator: TextOp | PhoneOp | StatusOp | DateOp;
    value?:
    | string
    | { start: string; end: string } // date_between
    | null;
};

export type FilterGroup = {
    type: "group";
    operator: FilterOperator;
    filters: Array<FilterGroup | FilterLeaf>;
};

export type FilterSpec = FilterGroup;

/* =========================
   View State (Table)
   ========================= */

export type SortSpec = {
    propertyId: string;
    direction: "ascending" | "descending";
};

export type GroupSpec = {
    propertyId: string;
    sort:
    | { mode: "manual"; order: string[] }
    | { mode: "alphabetical"; direction: "ascending" | "descending" };
    hideEmptyGroups: boolean;
};

export type ColumnState = {
    propertyId: string;
    visible: boolean;
    widthPx?: number;
    frozen?: "left" | "none";
};

export type TableViewState = {
    id: string;
    name: string;
    type: "table";

    columns: ColumnState[];
    columnOrder: string[];

    filter: FilterSpec | null;
    sorts: SortSpec[];
    groupBy: GroupSpec | null;

    rowDensity: "compact" | "default" | "comfortable";
    wrapCells: boolean;
    openPageIn: "side_peek" | "center" | "full_page";

    pageSize?: number;
};
