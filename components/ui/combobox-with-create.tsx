'use client';

import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, Trash2, Eye, EyeOff, Flag } from "lucide-react";
import { Button, Input } from "@/components/ui/core";
import { cn } from "@/components/ui/core";

export interface ComboboxItem {
    id: string;
    label: string; // display name (name_ar)
    value: string; // value to submit (code or name)
    isActive: boolean;
    flag?: string; // Emoji char or Image URL
    iso_code?: string; // ISO 2 char
}

interface ComboboxWithCreateProps {
    label: string;
    items: ComboboxItem[];
    selectedValue?: string;
    onSelect: (value: string) => void;
    onCreate: (name: string) => Promise<void>;
    onToggleStatus: (id: string, isActive: boolean) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    onUpdateMeta?: (id: string, type: 'FLAG', value: string) => Promise<void>;
    onUploadFlag?: (id: string, file: File) => Promise<void>;
    isAdmin?: boolean;
    placeholder?: string;
}

export function ComboboxWithCreate({
    label,
    items,
    selectedValue,
    onSelect,
    onCreate,
    onToggleStatus,
    onDelete,
    onUpdateMeta,
    onUploadFlag,
    isAdmin = false,
    placeholder = "اختر..."
}: ComboboxWithCreateProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // File Upload State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingForId, setUploadingForId] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !uploadingForId || !onUploadFlag) return;

        try {
            await onUploadFlag(uploadingForId, e.target.files[0]);
        } catch (error) {
            console.error(error);
            alert("فشل رفع الملف");
        } finally {
            setUploadingForId(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Filter items
    const filteredItems = items.filter(item => {
        // If query is empty, show all (or active only if not admin?? No, logic handled by parent)
        // Parent passes items. Admin sees all, User sees active.
        if (!query) return true;
        return item.label.toLowerCase().includes(query.toLowerCase());
    });

    // Check strict match for creation
    const exactMatch = filteredItems.find(item => item.label.toLowerCase() === query.trim().toLowerCase());

    // Handle outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleCreate = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            await onCreate(query.trim());
            setQuery("");
            // Optimistic update or wait for parent re-render? Parent usually re-fetches.
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
        e.stopPropagation();
        if (!confirm(currentStatus ? "هل تريد إخفاء هذا الخيار؟" : "هل تريد تفعيل هذا الخيار؟")) return;

        await onToggleStatus(id, !currentStatus);
    };

    // Derived display
    const selectedItem = items.find(i => i.value === selectedValue || i.id === selectedValue); // relaxed match

    return (
        <div className="space-y-1 relative" ref={wrapperRef}>
            {label && (
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-gray-300">
                    {label}
                </label>
            )}

            <div
                className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-gray-50",
                    open && "ring-2 ring-ring ring-offset-2"
                )}
                onClick={() => setOpen(!open)}
            >
                <span className={!selectedItem ? "text-muted-foreground text-gray-400" : ""}>
                    {selectedItem ? selectedItem.label : placeholder}
                </span>
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </div>

            {open && (
                <div className="absolute z-50 w-full mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md bg-white animate-in zoom-in-95 duration-200">
                    <div className="p-1">
                        <Input
                            placeholder={`بحث عن ${label}...`}
                            className="h-8 text-right"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="max-h-[200px] overflow-y-auto p-1 space-y-1">
                        {filteredItems.length === 0 && !query && (
                            <div className="py-6 text-center text-sm text-gray-500">لا يوجد خيارات</div>
                        )}

                        {filteredItems.map(item => (
                            <div
                                key={item.id}
                                className={cn(
                                    "relative flex items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none cursor-pointer hover:bg-blue-50 hover:text-blue-900 transition-colors group",
                                    item.value === selectedValue && "bg-blue-50 text-blue-900 font-bold",
                                    !item.isActive && "opacity-60 bg-gray-50 text-gray-400"
                                )}
                                onClick={() => {
                                    if (item.isActive || isAdmin) {
                                        onSelect(item.value);
                                        setOpen(false);
                                        setQuery("");
                                    }
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    {item.value === selectedValue && <Check className="h-4 w-4 text-blue-600" />}

                                    {/* Flag Display */}
                                    {item.iso_code ? (
                                        <span className={`fi fi-${item.iso_code.toLowerCase()} ml-2 text-lg rounded shadow-sm`} />
                                    ) : item.flag && (item.flag.startsWith('/') || item.flag.startsWith('http')) ? (
                                        <img src={item.flag} alt="flag" className="w-5 h-3 object-cover rounded-[1px] shadow-sm ml-1" />
                                    ) : (
                                        <span className="ml-1 text-lg leading-none">{item.flag}</span>
                                    )}

                                    <span className={item.value === selectedValue ? "font-bold" : ""}>{item.label}</span>
                                    {!item.isActive && <span className="text-[10px] bg-gray-200 px-1 rounded text-gray-500">معطل</span>}
                                </div>

                                {isAdmin && (
                                    <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                        {/* Update ISO/Emoji Button - Replaces Upload for now as per user pref */}
                                        {onUpdateMeta && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                type="button"
                                                className="h-6 w-6 text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const current = item.iso_code?.toUpperCase() || item.flag || '';
                                                    const newVal = prompt("أدخل كود الدولة (مثل ES, FR) أو رمز تعبيري:", current);
                                                    if (newVal !== null && newVal !== current) {
                                                        // Detect type passed to check
                                                        // But onUpdateMeta expects 'FLAG' type usually. 
                                                        // Let's pass 'ISO_OR_FLAG' or just use 'FLAG' and let parent decide?
                                                        // Changing signature might be needed or parent logic.
                                                        // Reverting to generic 'META' or just 'FLAG' and parent acts smart.
                                                        onUpdateMeta(item.id, 'FLAG', newVal);
                                                    }
                                                }}
                                                title="تحديث العلم (كود/صورة)"
                                            >
                                                <Flag className="h-3 w-3" />
                                            </Button>
                                        )}

                                        {/* Toggle Status */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            type="button"
                                            className="h-6 w-6 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                            onClick={(e) => handleToggle(e, item.id, item.isActive)}
                                            title={item.isActive ? "تعطيل" : "تفعيل"}
                                        >
                                            {item.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-red-500" />}
                                        </Button>

                                        {/* Delete */}
                                        {onDelete && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                type="button"
                                                className="h-6 w-6 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`هل أنت متأكد من حذف ${item.label}؟`)) {
                                                        onDelete(item.id);
                                                    }
                                                }}
                                                title="حذف"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Create Option */}
                        {query && !exactMatch && (
                            <button
                                type="button"
                                onClick={handleCreate}
                                disabled={loading}
                                className="w-full flex items-center gap-2 rounded-sm px-2 py-2 text-sm text-blue-600 hover:bg-blue-50 justify-center font-bold border-t border-dashed border-gray-100 mt-1"
                            >
                                <Plus className="h-4 w-4" />
                                {loading ? "جاري الإضافة..." : `إضافة "${query}"`}
                            </button>
                        )}
                    </div>
                </div>
            )}
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
        </div>
    );
}
