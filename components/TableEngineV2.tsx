"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    ColumnDef,
    SortingState,
    ColumnFiltersState,
    VisibilityState,
    ColumnOrderState,
    flexRender,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Case, Applicant, OperationalStatus } from "@/lib/storage/types";
import { cn } from "@/components/ui/core";
import {
    Search, Settings2, X, MoreVertical, SortAsc, SortDesc,
    Check, Filter, GripVertical, Pin, PinOff, ChevronDown,
    Calendar, User, Phone, FileText, Clock, AlertCircle,
    Inbox, Loader2, ChevronLeft, ChevronRight
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Checkbox from "@radix-ui/react-checkbox";
import { getOperationalStatusesAction } from "@/lib/actions";

interface TableEngineV2Props {
    cases: Case[];
    totalCount?: number;
    currentPage?: number;
    pageSize?: number;
    onPageChange?: (page: number) => void;
}

// Flatten applicants for table rows
type FlattenedApplicant = Applicant & {
    fileNumber: string;
    travelDate?: string;
    createdBy?: string;
    caseId: string;
};

export function TableEngineV2({
    cases,
    totalCount,
    currentPage = 1,
    pageSize = 50,
    onPageChange
}: TableEngineV2Props) {
    // --- STATE ---
    const [statuses, setStatuses] = useState<OperationalStatus[]>([]);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // --- REFS ---
    const tableContainerRef = useRef<HTMLDivElement>(null);

    // --- FETCH STATUSES ---
    useEffect(() => {
        const loadStatuses = async () => {
            const data = await getOperationalStatusesAction();
            setStatuses(data || []);
        };
        loadStatuses();
    }, []);

    // --- DATA TRANSFORMATION ---
    const flattenedData: FlattenedApplicant[] = useMemo(() => {
        return cases.flatMap(c =>
            (c.applicants || []).map(a => ({
                ...a,
                fileNumber: c.fileNumber,
                travelDate: c.travelDate,
                createdBy: c.createdBy || 'سيستم',
                caseId: c.id
            }))
        );
    }, [cases]);

    // --- COLUMN DEFINITIONS ---
    const columns = useMemo<ColumnDef<FlattenedApplicant>[]>(() => [
        {
            id: 'fileNumber',
            accessorKey: 'fileNumber',
            header: 'رقم الطلب',
            size: 120,
            cell: ({ getValue }) => (
                <div className="font-black text-gray-900 text-xs">{getValue() as string}</div>
            ),
            meta: { isCore: true, pinned: true }
        },
        {
            id: 'nameInPassport',
            accessorKey: 'nameInPassport',
            header: 'الاسم (مطابق للجواز)',
            size: 220,
            cell: ({ getValue }) => (
                <div className="font-bold text-gray-800 text-xs">{getValue() as string}</div>
            ),
            meta: { isCore: true, pinned: true }
        },
        {
            id: 'passportNumber',
            accessorKey: 'passportNumber',
            header: 'رقم الجواز',
            size: 140,
            cell: ({ getValue }) => (
                <div className="font-mono text-gray-500 text-xs uppercase">{getValue() as string}</div>
            ),
            meta: { isCore: true, pinned: true }
        },
        {
            id: 'statusId',
            accessorKey: 'statusId',
            header: 'الحالة',
            size: 160,
            cell: ({ getValue }) => {
                const status = statuses.find(s => s.id === getValue());
                return status ? <StatusBadge status={status} /> : <span className="text-gray-300">--</span>;
            },
            filterFn: (row, id, value) => value.includes(row.getValue(id)),
        },
        {
            id: 'createdBy',
            accessorKey: 'createdBy',
            header: 'الموظف',
            size: 140,
            cell: ({ getValue }) => (
                <div className="flex items-center gap-2">
                    <User size={12} className="text-gray-300" />
                    <span className="text-gray-500 text-xs font-bold">{getValue() as string}</span>
                </div>
            ),
        },
        {
            id: 'mobileNumber',
            accessorKey: 'mobileNumber',
            header: 'رقم الجوال',
            size: 140,
            cell: ({ getValue }) => (
                <div className="font-mono text-gray-400 text-xs">{getValue() as string || '--'}</div>
            ),
        },
        {
            id: 'biometricsDate',
            accessorKey: 'biometricsDate',
            header: 'تاريخ البصمة',
            size: 130,
            cell: ({ getValue }) => {
                const val = getValue() as string;
                return val ? (
                    <span className="font-black text-gray-500 text-xs">{format(parseISO(val), "d MMM", { locale: arSA })}</span>
                ) : '--';
            },
        },
        {
            id: 'biometricsTime',
            accessorKey: 'biometricsTime',
            header: 'وقت الموعد',
            size: 110,
            cell: ({ getValue }) => (
                <span className="text-xs text-gray-600">{getValue() as string || '--'}</span>
            ),
        },
        // Boolean columns
        ...['msgDocs', 'msgAppointment', 'msgBiometrics', 'msgPassport', 'appIssued', 'insurance', 'tickets', 'hotel'].map(key => ({
            id: key,
            accessorKey: key,
            header: getLabelForKey(key),
            size: 100,
            cell: ({ getValue }: any) => <BooleanCell checked={getValue()} />,
        })),
    ], [statuses]);

    // --- TABLE INSTANCE ---
    const table = useReactTable({
        data: flattenedData,
        columns,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            columnOrder,
            globalFilter,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onColumnOrderChange: setColumnOrder,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        manualPagination: !!onPageChange,
        pageCount: totalCount ? Math.ceil(totalCount / pageSize) : undefined,
    });

    // --- VIRTUALIZATION ---
    const { rows } = table.getRowModel();
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 48, // Row height in pixels
        overscan: 10,
    });

    const virtualRows = rowVirtualizer.getVirtualItems();
    const totalSize = rowVirtualizer.getTotalSize();
    const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
    const paddingBottom = virtualRows.length > 0
        ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
        : 0;

    // --- RENDER ---
    return (
        <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">

            {/* TOOLBAR */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50/20 shrink-0">
                <div className="flex items-center gap-4 flex-1">
                    {/* Global Search */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm w-80 focus-within:ring-2 focus-within:ring-blue-500/20">
                        <Search size={16} className="text-gray-400" />
                        <input
                            placeholder="بحث سريع..."
                            value={globalFilter}
                            onChange={e => setGlobalFilter(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs w-full font-bold text-gray-700"
                        />
                    </div>

                    {/* Active Filters Chips */}
                    <div className="flex items-center gap-2 overflow-x-auto">
                        {table.getState().columnFilters.map(filter => (
                            <div key={filter.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black border border-blue-100">
                                <span className="opacity-50">{table.getColumn(filter.id)?.columnDef.header as string}:</span>
                                <span>{Array.isArray(filter.value) ? `${(filter.value as any[]).length} مرشح` : String(filter.value)}</span>
                                <button onClick={() => table.getColumn(filter.id)?.setFilterValue(undefined)} className="hover:bg-blue-200 rounded p-0.5">
                                    <X size={10} strokeWidth={3} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-400 border-r pr-4 uppercase">{rows.length} سجل</span>
                    <ColumnsToggle table={table} />
                </div>
            </div>

            {/* TABLE CONTAINER */}
            <div
                ref={tableContainerRef}
                className="flex-1 overflow-auto bg-white relative"
                style={{ height: '100%' }}
            >
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="animate-spin text-blue-500" size={40} />
                    </div>
                ) : (
                    <table className="w-full border-collapse table-fixed">
                        <thead className="sticky top-0 z-30 bg-white shadow-sm border-b">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header, idx) => (
                                        <TableHeader
                                            key={header.id}
                                            header={header}
                                            table={table}
                                            statuses={statuses}
                                        />
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {paddingTop > 0 && (
                                <tr>
                                    <td style={{ height: `${paddingTop}px` }} />
                                </tr>
                            )}
                            {virtualRows.map(virtualRow => {
                                const row = rows[virtualRow.index];
                                return (
                                    <tr key={row.id} className="hover:bg-blue-50/40 transition-colors border-b border-gray-50">
                                        {row.getVisibleCells().map(cell => (
                                            <td
                                                key={cell.id}
                                                className="px-5 py-3 text-xs text-gray-600 whitespace-nowrap border-l border-gray-50"
                                                style={{ width: cell.column.getSize() }}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                            {paddingBottom > 0 && (
                                <tr>
                                    <td style={{ height: `${paddingBottom}px` }} />
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {rows.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center p-32">
                        <Inbox size={80} strokeWidth={0.5} className="mb-6 opacity-20 text-gray-300" />
                        <h3 className="font-black text-xl text-gray-400">لا توجد بيانات</h3>
                    </div>
                )}
            </div>

            {/* PAGINATION FOOTER */}
            {onPageChange && totalCount && (
                <div className="border-t bg-gray-50/50 px-6 py-3 flex items-center justify-between shrink-0">
                    <div className="text-xs font-bold text-gray-500">
                        عرض {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} من {totalCount}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <span className="text-xs font-black px-3">صفحة {currentPage}</span>
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage * pageSize >= totalCount}
                            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- SUB-COMPONENTS ---

function TableHeader({ header, table, statuses }: any) {
    const { column } = header;
    const isSorted = column.getIsSorted();

    return (
        <th
            className="px-5 py-4 text-right text-[11px] font-black text-gray-500 uppercase tracking-wider relative group border-b border-gray-100 bg-white"
            style={{ width: column.getSize() }}
        >
            <div className="flex items-center justify-between gap-2">
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={column.getToggleSortingHandler()}
                >
                    <span>{flexRender(column.columnDef.header, header.getContext())}</span>
                    {isSorted && (
                        isSorted === 'asc'
                            ? <SortAsc size={14} className="text-blue-600" />
                            : <SortDesc size={14} className="text-blue-600" />
                    )}
                </div>

                <HeaderMenuDropdown column={column} table={table} statuses={statuses} />
            </div>

            {column.getIsFiltered() && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
        </th>
    );
}

function HeaderMenuDropdown({ column, table, statuses }: any) {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all">
                    <MoreVertical size={14} />
                </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="start" className="w-64 bg-white shadow-2xl rounded-2xl border z-50 p-2">
                <div className="p-2 border-b mb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase">تصفية: {column.columnDef.header}</span>
                </div>

                {/* Sort Options */}
                <DropdownMenu.Item
                    onSelect={() => column.toggleSorting(false)}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-xl outline-none cursor-pointer"
                >
                    <SortAsc size={14} />
                    <span className="text-xs font-bold">ترتيب تصاعدي</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                    onSelect={() => column.toggleSorting(true)}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-xl outline-none cursor-pointer"
                >
                    <SortDesc size={14} />
                    <span className="text-xs font-bold">ترتيب تنازلي</span>
                </DropdownMenu.Item>

                <div className="border-t my-2" />

                {/* Filter by Type */}
                {column.id === 'statusId' && (
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                        {statuses.map((s: OperationalStatus) => (
                            <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer">
                                <Checkbox.Root
                                    checked={((column.getFilterValue() || []) as string[]).includes(s.id)}
                                    onCheckedChange={checked => {
                                        const current = (column.getFilterValue() || []) as string[];
                                        column.setFilterValue(
                                            checked
                                                ? [...current, s.id]
                                                : current.filter(id => id !== s.id)
                                        );
                                    }}
                                    className="w-4 h-4 rounded border-2 border-gray-200 flex items-center justify-center data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                >
                                    <Checkbox.Indicator><Check size={10} className="text-white" strokeWidth={4} /></Checkbox.Indicator>
                                </Checkbox.Root>
                                <StatusBadge status={s} />
                            </label>
                        ))}
                    </div>
                )}

                {column.getIsFiltered() && (
                    <>
                        <div className="border-t my-2" />
                        <button
                            onClick={() => column.setFilterValue(undefined)}
                            className="w-full text-right p-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl"
                        >
                            إزالة الفلتر
                        </button>
                    </>
                )}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}

function ColumnsToggle({ table }: any) {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button className="p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md">
                    <Settings2 size={18} />
                </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" className="w-72 bg-white p-4 shadow-2xl rounded-2xl border z-50">
                <div className="mb-4 border-b pb-2">
                    <span className="text-xs font-black text-gray-800 uppercase">الأعمدة المرئية</span>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                    {table.getAllLeafColumns().map((column: any) => (
                        <label key={column.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 cursor-pointer">
                            <Checkbox.Root
                                checked={column.getIsVisible()}
                                onCheckedChange={column.getToggleVisibilityHandler()}
                                disabled={column.columnDef.meta?.isCore}
                                className="w-4.5 h-4.5 rounded border-2 border-gray-200 flex items-center justify-center data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 disabled:opacity-50"
                            >
                                <Checkbox.Indicator><Check size={12} className="text-white" strokeWidth={4} /></Checkbox.Indicator>
                            </Checkbox.Root>
                            <span className="text-xs font-bold text-gray-700">{column.columnDef.header}</span>
                            {column.columnDef.meta?.isCore && <Pin size={10} className="text-blue-500 rotate-45 ml-auto" />}
                        </label>
                    ))}
                </div>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}

function StatusBadge({ status }: { status: OperationalStatus }) {
    const bgClass = getStatusBg(status.color);
    const textClass = getStatusText(status.color);
    return (
        <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black border", bgClass, textClass)}>
            <div className={cn("w-1.5 h-1.5 rounded-full", textClass.replace('text', 'bg'))} />
            <span>{status.label}</span>
        </div>
    );
}

function BooleanCell({ checked }: { checked?: boolean }) {
    return (
        <div className={cn(
            "w-5 h-5 rounded-md border-2 flex items-center justify-center",
            checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-100 bg-gray-50"
        )}>
            {checked && <Check size={12} strokeWidth={4} />}
        </div>
    );
}

// --- UTILS ---

function getStatusBg(color: string) {
    const map: any = {
        'blue': 'bg-blue-50 border-blue-100',
        'red': 'bg-red-50 border-red-100',
        'orange': 'bg-orange-50 border-orange-100',
        'purple': 'bg-purple-50 border-purple-100',
        'indigo': 'bg-indigo-50 border-indigo-100',
        'amber': 'bg-amber-50 border-amber-100',
        'emerald': 'bg-emerald-50 border-emerald-100',
        'gray': 'bg-gray-50 border-gray-100'
    };
    return map[color] || 'bg-gray-50 border-gray-100';
}

function getStatusText(color: string) {
    const map: any = {
        'blue': 'text-blue-700',
        'red': 'text-red-700',
        'orange': 'text-orange-700',
        'purple': 'text-purple-700',
        'indigo': 'text-indigo-700',
        'amber': 'text-amber-700',
        'emerald': 'text-emerald-700',
        'gray': 'text-gray-700'
    };
    return map[color] || 'text-gray-700';
}

function getLabelForKey(key: string): string {
    const labels: Record<string, string> = {
        'msgDocs': 'طلب الأوراق',
        'msgAppointment': 'رسالة الموعد',
        'msgBiometrics': 'تذكير البصمة',
        'msgPassport': 'استلام الجواز',
        'appIssued': 'الأبليكيشن',
        'insurance': 'التأمين',
        'tickets': 'التذاكر',
        'hotel': 'الفندق'
    };
    return labels[key] || key;
}
