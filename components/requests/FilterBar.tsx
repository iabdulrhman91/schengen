"use client";

import React, { useState, useRef, useEffect } from "react";
import { FilterSpec, FilterLeaf, PropertyType } from "@/lib/filters/types";
import { Plus, Search, ListFilter, X, ChevronDown, Trash2, Calendar, Phone, CheckCircle2, UserCircle } from "lucide-react";
import { cn } from "@/components/ui/core";
import { CustomDatePicker } from "@/components/ui/date-picker";

interface Property {
    id: string;
    label: string;
    type: string;
    icon: React.ReactNode;
}

interface FilterBarProps {
    filterSpec: FilterSpec;
    onChange: (spec: FilterSpec) => void;
    availableProperties: Property[];
}

export function FilterBar({ filterSpec, onChange, availableProperties }: FilterBarProps) {
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [activePillPop, setActivePillPop] = useState<string | null>(null);
    const addMenuRef = useRef<HTMLDivElement>(null);
    const pillPopRef = useRef<HTMLDivElement>(null);

    const getStatusLabel = (id: string) => {
        const statuses: Record<string, string> = {
            'not_started': 'لم تبدأ',
            'in_progress': 'قيد العمل',
            'review': 'بحاجة لمراجعة',
            'completed': 'مكتمل',
            'rejected': 'مرفوض'
        };
        return statuses[id] || id;
    };

    // Close menus on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            const target = e.target as Node;

            // Check if click is inside a date picker popover (has data-radix-popper-content-wrapper attribute or is inside one)
            let element = target as HTMLElement;
            while (element) {
                if (element.hasAttribute?.('data-radix-popper-content-wrapper') ||
                    element.getAttribute?.('role') === 'dialog' ||
                    element.classList?.contains('date-picker-popover')) {
                    return; // Don't close if clicking inside date picker
                }
                element = element.parentElement as HTMLElement;
            }

            if (addMenuRef.current && !addMenuRef.current.contains(target)) setIsAddMenuOpen(false);
            if (pillPopRef.current && !pillPopRef.current.contains(target)) setActivePillPop(null);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const addFilter = (prop: Property) => {
        // Prevent duplicate filters for the same property for simplicity
        if (filterSpec.filters.some(f => (f as FilterLeaf).propertyId === prop.id)) {
            setActivePillPop(prop.id);
            setIsAddMenuOpen(false);
            return;
        }

        const newLeaf: FilterLeaf = {
            type: "property",
            propertyId: prop.id,
            propertyType: mapType(prop.type),
            operator: mapDefaultOperator(prop.type),
            value: ""
        };

        onChange({
            ...filterSpec,
            filters: [...filterSpec.filters, newLeaf]
        });

        setIsAddMenuOpen(false);
        setActivePillPop(prop.id);
    };

    const removeFilter = (propertyId: string) => {
        onChange({
            ...filterSpec,
            filters: filterSpec.filters.filter(f => (f as FilterLeaf).propertyId !== propertyId)
        });
        setActivePillPop(null);
    };

    const updateValue = (propertyId: string, value: any) => {
        const newFilters = filterSpec.filters.map(f => {
            if (f.type === "property" && f.propertyId === propertyId) {
                return { ...f, value };
            }
            return f;
        });
        onChange({ ...filterSpec, filters: newFilters as any });
    };

    const mapType = (type: string): any => {
        if (type === 'status') return 'status';
        if (type === 'number') return 'text'; // simplify numbers to text search for now
        if (type === 'date') return 'date';
        return 'text';
    };

    const mapDefaultOperator = (type: string): any => {
        if (type === 'status') return 'status_is';
        if (type === 'date') return 'date_is';
        return 'string_contains';
    };

    const activeFilterLeaves = filterSpec.filters.filter(f => f.type === "property") as FilterLeaf[];

    return (
        <div className="flex flex-wrap items-center gap-2 px-8 py-2 bg-white border-b border-gray-50 min-h-[48px]" dir="rtl">
            {/* Active Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
                {activeFilterLeaves.map(leaf => {
                    const prop = availableProperties.find(p => p.id === leaf.propertyId);
                    if (!prop) return null;

                    return (
                        <div key={leaf.propertyId} className="relative">
                            <button
                                onClick={() => setActivePillPop(leaf.propertyId)}
                                className={cn(
                                    "flex items-center gap-2 px-2.5 py-1 rounded-lg text-[13px] border transition-all",
                                    leaf.value
                                        ? "bg-blue-50 border-blue-100 text-blue-700 font-medium"
                                        : "bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                <span className="opacity-70">{prop.icon}</span>
                                <span>{prop.label}</span>
                                {leaf.value && (
                                    <span className="max-w-[100px] truncate opacity-80 border-r border-blue-200 pr-2 mr-1">
                                        {typeof leaf.value === 'string'
                                            ? (prop.type === 'status' ? getStatusLabel(leaf.value) : leaf.value)
                                            : JSON.stringify(leaf.value)
                                        }
                                    </span>
                                )}
                                <ChevronDown size={14} className="opacity-40" />
                            </button>

                            {/* Pill Popover */}
                            {activePillPop === leaf.propertyId && (
                                <div
                                    ref={pillPopRef}
                                    className="absolute top-full mt-1 right-0 w-64 bg-white shadow-2xl border border-gray-200 rounded-xl z-[200] p-3 animate-in fade-in zoom-in-95"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase">
                                            {prop.icon} {prop.label}
                                        </div>
                                        <button
                                            onClick={() => removeFilter(leaf.propertyId)}
                                            className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded transition-colors"
                                            title="إزالة عامل التصفية"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    {prop.type === 'status' ? (
                                        <select
                                            autoFocus
                                            className="w-full bg-gray-50 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={leaf.value as string}
                                            onChange={(e) => updateValue(leaf.propertyId, e.target.value)}
                                        >
                                            <option value="">اختر الحالة...</option>
                                            <option value="not_started">لم تبدأ</option>
                                            <option value="in_progress">قيد العمل</option>
                                            <option value="review">بحاجة لمراجعة</option>
                                            <option value="completed">مكتمل</option>
                                            <option value="rejected">مرفوض</option>
                                        </select>
                                    ) : prop.type === 'date' ? (
                                        <CustomDatePicker
                                            value={leaf.value ? new Date(leaf.value as string) : undefined}
                                            onChange={(date) => updateValue(leaf.propertyId, date ? date.toISOString().split('T')[0] : "")}
                                            className="w-full bg-gray-50 border-none rounded-lg px-3 py-2 text-sm text-gray-900 justify-start font-normal"
                                            placeholder="اختر التاريخ..."
                                        />
                                    ) : (
                                        <input
                                            autoFocus
                                            className="w-full bg-gray-50 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="اكتب قيمة..."
                                            value={leaf.value as string}
                                            onChange={(e) => updateValue(leaf.propertyId, e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && setActivePillPop(null)}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Add Filter Button */}
            <div className="relative">
                <button
                    onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all text-[13px] font-medium"
                >
                    <Plus size={16} />
                    عامل التصفية
                </button>

                {isAddMenuOpen && (
                    <div
                        ref={addMenuRef}
                        className="absolute top-full mt-1 right-0 w-56 bg-white shadow-2xl border border-gray-200 rounded-xl z-[200] overflow-hidden py-1.5 animate-in fade-in zoom-in-95"
                    >
                        <div className="px-3 py-1.5 text-[10px] font-black text-gray-300 uppercase tracking-widest">تصفية حسب</div>
                        <div className="max-h-64 overflow-auto scrollbar-hide">
                            {availableProperties.map(prop => (
                                <button
                                    key={prop.id}
                                    onClick={() => addFilter(prop)}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-[13px] text-gray-600 text-right transition-colors"
                                >
                                    <span className="opacity-50 group-hover:opacity-100">{prop.icon}</span>
                                    <span>{prop.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {activeFilterLeaves.some(l => l.value) && (
                <button
                    onClick={() => onChange({ ...filterSpec, filters: [] })}
                    className="mr-auto text-[11px] font-bold text-gray-400 hover:text-red-500 transition-colors"
                >
                    مسح الكل
                </button>
            )}
        </div>
    );
}
