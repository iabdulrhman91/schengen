export type ColumnDataType = 'text' | 'number' | 'date' | 'status' | 'boolean' | 'select' | 'multi-select' | 'person' | 'phone' | 'url';

export interface NotionColumnDef {
    id: string;
    header: string;
    accessorKey: string;
    type: ColumnDataType;
    isCore?: boolean;
    width?: number;
    editable?: boolean;
    options?: { label: string; value: string; color?: string }[]; // For select/status
}
