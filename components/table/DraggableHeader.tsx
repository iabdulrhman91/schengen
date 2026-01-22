"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Header, flexRender, Table } from '@tanstack/react-table';
import { cn } from '@/components/ui/core';
import { GripVertical, ArrowUp, ArrowDown, ListFilter, EyeOff } from 'lucide-react';
import * as Popover from "@radix-ui/react-popover";

interface DraggableHeaderProps {
    header: Header<any, unknown>;
    table: Table<any>;
}

export function DraggableHeader({ header, table }: DraggableHeaderProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: header.id,
    });

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition,
        width: header.getSize(),
        zIndex: isDragging ? 40 : 'auto',
        opacity: isDragging ? 0.8 : 1,
    };

    const isSorted = header.column.getIsSorted();

    return (
        <th
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative px-3 py-2 text-right font-medium text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100 last:border-r-0 select-none",
                isDragging && "bg-white shadow-xl rounded-lg"
            )}
        >
            <div className="flex items-center justify-between gap-2 overflow-hidden">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-200 rounded"
                >
                    <GripVertical size={12} />
                </div>

                <div
                    className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer flex items-center gap-1.5"
                    onClick={header.column.getToggleSortingHandler()}
                >
                    <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                    {isSorted === 'asc' && <ArrowUp size={12} className="text-blue-500" />}
                    {isSorted === 'desc' && <ArrowDown size={12} className="text-blue-500" />}
                </div>

                <Popover.Root>
                    <Popover.Trigger asChild>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded cursor-pointer">
                            <ListFilter size={12} />
                        </div>
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Content className="z-[200] bg-white rounded-xl shadow-2xl border border-gray-100 p-2 min-w-[180px] animate-in slide-in-from-top-2 duration-200 focus:outline-none">
                            <div className="space-y-1">
                                <button
                                    onClick={() => header.column.toggleSorting(false)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors"
                                >
                                    <ArrowUp size={14} className="text-gray-400" />
                                    <span>ترتيب تصاعدي</span>
                                </button>
                                <button
                                    onClick={() => header.column.toggleSorting(true)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors"
                                >
                                    <ArrowDown size={14} className="text-gray-400" />
                                    <span>ترتيب تنازلي</span>
                                </button>
                                <div className="h-px bg-gray-50 my-1" />

                                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase">تصفية</div>

                                {(header.column.columnDef.meta as any)?.type === 'text' && (
                                    <input
                                        placeholder="بحث..."
                                        className="w-full px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                        value={(header.column.getFilterValue() as string) ?? ''}
                                        onChange={e => header.column.setFilterValue(e.target.value)}
                                    />
                                )}

                                {(header.column.columnDef.meta as any)?.type === 'status' && (header.column.columnDef.meta as any)?.options && (
                                    <select
                                        className="w-full px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none"
                                        value={(header.column.getFilterValue() as string) ?? ''}
                                        onChange={e => header.column.setFilterValue(e.target.value)}
                                    >
                                        <option value="">الكل</option>
                                        {(header.column.columnDef.meta as any).options.map((opt: any) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                )}

                                {(header.column.columnDef.meta as any)?.type === 'boolean' && (
                                    <select
                                        className="w-full px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none"
                                        value={(header.column.getFilterValue() as string) ?? ''}
                                        onChange={e => header.column.setFilterValue(e.target.value)}
                                    >
                                        <option value="">الكل</option>
                                        <option value="true">نعم</option>
                                        <option value="false">لا</option>
                                    </select>
                                )}

                                <div className="h-px bg-gray-50 my-2" />

                                <button
                                    onClick={() => header.column.toggleVisibility(false)}
                                    disabled={!header.column.getCanHide()}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors disabled:opacity-30"
                                >
                                    <EyeOff size={14} className="text-gray-400" />
                                    <span>إخفاء العمود</span>
                                </button>
                            </div>
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>
            </div>

            {/* RESIZER */}
            <div
                onMouseDown={header.getResizeHandler()}
                onTouchStart={header.getResizeHandler()}
                className={cn(
                    "absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors",
                    header.column.getIsResizing() ? "bg-blue-500 w-1" : ""
                )}
            />
        </th>
    );
}
