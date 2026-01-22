"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    ColumnDef,
    SortingState,
    ColumnFiltersState,
    VisibilityState,
    ColumnOrderState,
} from '@tanstack/react-table';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { useVirtualizer } from '@tanstack/react-virtual';

import { cn } from '@/components/ui/core';
import {
    Search,
    ChevronDown,
    MoreHorizontal,
    ArrowUpDown,
    EyeOff,
    Filter,
    Plus,
    GripVertical,
    Calendar,
    CheckCircle2,
    User,
    Phone,
    Link as LinkIcon,
    Hash,
    Type,
    ListFilter,
    Inbox
} from 'lucide-react';

import * as Popover from "@radix-ui/react-popover";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Checkbox from "@radix-ui/react-checkbox";

import { NotionColumnDef, ColumnDataType } from './types';
import { DraggableHeader } from './DraggableHeader';
import { NotionCell } from './NotionCell';

interface NotionTableProps {
    data: any[];
    columns: NotionColumnDef[];
    onRowClick?: (row: any) => void;
    onUpdateCell?: (rowId: string, columnId: string, value: any) => Promise<any>;
    persistanceKey?: string;
    onSaveView?: (view: any) => void;
    onSavePreference?: (pref: any) => Promise<any>;
}

export function NotionTable({ data, columns: initialColumns, onRowClick, onUpdateCell, persistanceKey, onSavePreference }: NotionTableProps) {
    // --- STATE ---
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
        initialColumns.map(c => c.id)
    );
    const [globalFilter, setGlobalFilter] = useState('');
    const [isHydrated, setIsHydrated] = useState(false);

    // --- PERSISTENCE ---
    useEffect(() => {
        if (!persistanceKey) {
            setIsHydrated(true);
            return;
        }
        const saved = localStorage.getItem(`notion_table_${persistanceKey}`);
        if (saved) {
            try {
                const { order, visibility, sorting: savedSorting } = JSON.parse(saved);
                if (order) setColumnOrder(order);
                if (visibility) setColumnVisibility(visibility);
                if (savedSorting) setSorting(savedSorting);
            } catch (e) {
                console.error("Failed to load table prefs", e);
            }
        }
        setIsHydrated(true);
    }, [persistanceKey]);

    useEffect(() => {
        if (!isHydrated || !persistanceKey) return;
        const prefs = {
            order: columnOrder,
            visibility: columnVisibility,
            sorting,
        };
        localStorage.setItem(`notion_table_${persistanceKey}`, JSON.stringify(prefs));

        // Sync to server (Debounced)
        const timeout = setTimeout(() => {
            if (onSavePreference) {
                onSavePreference(prefs);
            }
        }, 2000);
        return () => clearTimeout(timeout);
    }, [columnOrder, columnVisibility, sorting, persistanceKey, isHydrated, onSavePreference]);

    // --- TABLE CONFIG ---
    const columns = useMemo<ColumnDef<any>[]>(() => {
        return initialColumns.map(col => ({
            id: col.id,
            accessorKey: col.accessorKey,
            header: col.header,
            size: col.width || 150,
            enableHiding: !col.isCore,
            meta: {
                type: col.type,
                options: col.options
            },
            cell: (info) => (
                <NotionCell
                    value={info.getValue()}
                    type={col.type}
                    options={col.options}
                    isEditable={col.editable}
                    onUpdate={(val: any) => onUpdateCell && onUpdateCell(info.row.original.id, col.id, val)}
                />
            ),
        }));
    }, [initialColumns]);

    const table = useReactTable({
        data,
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
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        columnResizeMode: 'onChange',
    });

    const { rows } = table.getRowModel();

    // --- VIRTUALIZATION ---
    const parentRef = React.useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 40, // Height of row
        overscan: 10,
    });

    const virtualRows = virtualizer.getVirtualItems();
    const totalSize = virtualizer.getTotalSize();
    const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
    const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

    // --- DND HANDLERS ---
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            setColumnOrder(prev => {
                const oldIndex = prev.indexOf(active.id as string);
                const newIndex = prev.indexOf(over.id as string);
                return arrayMove(prev, oldIndex, newIndex);
            });
        }
    }

    return (
        <div className="flex flex-col h-full bg-white text-[13px] font-sans selection:bg-blue-100">
            {/* TOOLBAR */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100/80 gap-4">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {/* View Selector Placeholder */}
                    <div className="flex items-center gap-1.5 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer text-gray-600 font-medium whitespace-nowrap">
                        <ListFilter size={14} />
                        <span>الجدول الرئيسي</span>
                        <ChevronDown size={12} />
                    </div>

                    {columnFilters.length > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="w-px h-4 bg-gray-200 mx-1" />
                            {columnFilters.map(filter => {
                                const column = table.getColumn(filter.id);
                                return (
                                    <div key={filter.id} className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-md border border-blue-100 text-[11px] font-bold animate-in zoom-in-95">
                                        <span>{column?.columnDef.header as string}:</span>
                                        <span className="max-w-[100px] truncate opacity-80">{filter.value as string}</span>
                                        <button
                                            onClick={() => column?.setFilterValue(undefined)}
                                            className="hover:bg-blue-100 p-0.5 rounded transition-colors"
                                        >
                                            <Plus size={10} className="rotate-45" />
                                        </button>
                                    </div>
                                );
                            })}
                            <button
                                onClick={() => setColumnFilters([])}
                                className="text-[11px] text-gray-400 hover:text-red-500 font-bold transition-colors"
                            >
                                مسح الكل
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex items-center group">
                        <Search size={14} className="absolute left-2.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            placeholder="بحث..."
                            value={globalFilter}
                            onChange={e => setGlobalFilter(e.target.value)}
                            className="pl-8 pr-3 py-1.5 bg-gray-50/50 hover:bg-gray-100/50 focus:bg-white border-transparent focus:border-blue-200 border rounded transition-all outline-none w-48 focus:w-64"
                        />
                    </div>

                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <button className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-50 rounded text-gray-500 transition-colors border border-transparent hover:border-gray-100">
                                <EyeOff size={14} />
                                <span>الأعمدة</span>
                            </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                            <DropdownMenu.Content className="z-[200] bg-white rounded-lg shadow-xl border border-gray-100 p-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-100">
                                <div className="px-2 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">إظهار/إخفاء الأعمدة</div>
                                {table.getAllLeafColumns().map(column => {
                                    if (!column.getCanHide()) return null;
                                    return (
                                        <div key={column.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer group">
                                            <Checkbox.Root
                                                checked={column.getIsVisible()}
                                                onCheckedChange={value => column.toggleVisibility(!!value)}
                                                className="w-4 h-4 rounded border-2 border-gray-200 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 transition-all flex items-center justify-center text-white"
                                            >
                                                <Checkbox.Indicator><Plus size={10} strokeWidth={4} className="rotate-45" /></Checkbox.Indicator>
                                            </Checkbox.Root>
                                            <span className="text-gray-700 group-hover:text-black transition-colors">{column.columnDef.header as string}</span>
                                        </div>
                                    )
                                })}
                            </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                </div>
            </div>

            {/* TABLE ENGINE */}
            <div ref={parentRef} className="flex-1 overflow-auto no-scrollbar relative">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToHorizontalAxis]}
                >
                    <table className="w-full border-separate border-spacing-0 table-fixed min-w-full">
                        <thead className="sticky top-0 z-30 bg-white/80 backdrop-blur-md">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    <SortableContext
                                        items={columnOrder}
                                        strategy={horizontalListSortingStrategy}
                                    >
                                        {headerGroup.headers.map(header => (
                                            <DraggableHeader
                                                key={header.id}
                                                header={header}
                                                table={table}
                                            />
                                        ))}
                                    </SortableContext>
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
                                    <tr
                                        key={row.id}
                                        onClick={() => onRowClick && onRowClick(row.original)}
                                        style={{ height: `${virtualRow.size}px` }}
                                        className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                                    >
                                        {row.getVisibleCells().map(cell => (
                                            <td
                                                key={cell.id}
                                                style={{ width: cell.column.getSize() }}
                                                className={cn(
                                                    "px-3 py-0 h-[40px] transition-colors border-b border-r border-gray-100/50 group-hover:border-gray-200/50 last:border-r-0 whitespace-nowrap overflow-hidden text-ellipsis",
                                                    cell.column.getIsSorted() && "bg-blue-50/5"
                                                )}
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
                </DndContext>

                {data.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 text-gray-300">
                        <Inbox size={48} strokeWidth={1} />
                        <p className="mt-4 font-bold text-lg">لا توجد بيانات متاحة</p>
                    </div>
                )}
            </div>

            {/* FOOTER */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-gray-400 font-medium">
                <div className="flex items-center gap-4">
                    <span>{table.getFilteredRowModel().rows.length} طلب</span>
                    <div className="w-px h-4 bg-gray-100" />
                    <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="hover:text-gray-900 disabled:opacity-30 transition-opacity">السابق</button>
                    <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="hover:text-gray-900 disabled:opacity-30 transition-opacity">التالي</button>
                </div>
            </div>
        </div>
    );
}

