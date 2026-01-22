"use client";

import {
    Plus, Calendar, MapPin, Sun, ChevronDown, ChevronUp, Check,
    AlignLeft, Hash, ListTree, User, Paperclip,
    Link, Mail, Phone, Sigma, ArrowUpRight, Clock,
    UserCircle, Search, EyeOff, Trash2, GripHorizontal,
    MoreHorizontal, CheckSquare, Info, Eye, X, ArrowLeft,
    Maximize2, ExternalLink, SortAsc, SortDesc, Circle, PanelLeft,
    GripVertical, Copy, Undo2, Redo2, RotateCcw, Briefcase, Heart
} from "lucide-react";

// Notion-style icon wrapper to ensure consistency
const Icon = ({ icon: IconComponent, size = 14, className = "" }: { icon: any, size?: number, className?: string }) => (
    <IconComponent size={size} strokeWidth={1.5} className={className} />
);
import { CustomDatePicker } from "@/components/ui/date-picker";
import { updateTableCellAction, deleteCaseAction } from "@/lib/actions";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/components/ui/core";
import { FilterBar } from "@/app/requests/components/FilterBar";
import { evaluateRow } from "@/lib/filters/evaluateRow";
import { FilterSpec } from "@/lib/filters/types";

interface Column {
    id: string;
    label: string;
    width: number;
    icon: React.ReactNode;
    type: string;
    visible: boolean;
}

const STATUSES = [
    { id: 'os-new', label: 'طلب جديد', color: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500' },
    { id: 'os-review', label: 'قيد المراجعة', color: 'bg-orange-50 text-orange-600', dot: 'bg-orange-500' },
    { id: 'os-docs', label: 'انتظار النواقص', color: 'bg-red-50 text-red-600', dot: 'bg-red-500' },
    { id: 'os-booked', label: 'تم الحجز', color: 'bg-purple-50 text-purple-600', dot: 'bg-purple-500' },
    { id: 'os-ready', label: 'جاهز للبصمة', color: 'bg-indigo-50 text-indigo-600', dot: 'bg-indigo-500' },
    { id: 'os-submitted', label: 'تم التقديم', color: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500' },
    { id: 'os-received', label: 'تم استلام الجواز', color: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' },
    { id: 'os-cancel', label: 'ملغي', color: 'bg-red-50 text-red-600', dot: 'bg-red-500' },
];

const PROPERTY_TYPES = [
    { id: 'text', label: 'النص', icon: <AlignLeft size={16} />, group: 'suggested' },
    { id: 'number', label: 'الرقم', icon: <Hash size={16} />, group: 'suggested' },
    { id: 'select', label: 'تحديد', icon: <ChevronDown size={14} className="border rounded-full p-0.5" />, group: 'suggested' },
    { id: 'status', label: 'الحالة', icon: <Sun size={16} />, group: 'basic' },
    { id: 'date', label: 'التاريخ', icon: <Calendar size={16} />, group: 'basic' },
    { id: 'person', label: 'شخص', icon: <User size={16} />, group: 'basic' },
    { id: 'files', label: 'الملفات والوسائط', icon: <Paperclip size={16} />, group: 'basic' },
];

const DEFAULT_COLUMNS: Omit<Column, 'icon'>[] = [
    { id: "id_req", label: "رقم الطلب", width: 110, type: 'number', visible: true },
    { id: "name", label: "الاسم (مطابق للجواز)", width: 220, type: 'text', visible: true },
    { id: "appointmentDate", label: "تاريخ الموعد", width: 130, type: 'date', visible: true },
    { id: "embassy", label: "السفارة", width: 120, type: 'text', visible: true },
    { id: "location", label: "المركز", width: 120, type: 'text', visible: true },
    { id: "passport", label: "رقم الجواز", width: 130, type: 'text', visible: true },
    { id: "passportIssue", label: "إصدار الجواز", width: 130, type: 'date', visible: true },
    { id: "passportExpiry", label: "انتهاء الجواز", width: 130, type: 'date', visible: true },
    { id: "nationality", label: "الجنسية", width: 120, type: 'text', visible: true },
    { id: "status", label: "الحالة", width: 150, type: 'status', visible: true },
    { id: "nationalId", label: "رقم الهوية", width: 140, type: 'text', visible: true },
    { id: "employer", label: "جهة العمل", width: 160, type: 'text', visible: true },
    { id: "jobTitle", label: "المسمى الوظيفي", width: 160, type: 'text', visible: true },
    { id: "birth", label: "تاريخ الميلاد", width: 130, type: 'date', visible: true },
    { id: "placeOfBirth", label: "مكان الميلاد", width: 140, type: 'text', visible: true },
    { id: "phone", label: "رقم الجوال", width: 130, type: 'phone', visible: true },
    { id: "travelDate", label: "تاريخ السفر", width: 130, type: 'date', visible: true },
    { id: "returnDate", label: "تاريخ العودة", width: 130, type: 'date', visible: true },
    { id: "gender", label: "الجنس", width: 90, type: 'select', visible: true },
    { id: "maritalStatus", label: "الحالة الاجتماعية", width: 130, type: 'select', visible: true },
    { id: "sponsorship", label: "الكفالة", width: 120, type: 'text', visible: true },
    { id: "source", label: "المصدر", width: 140, type: 'text', visible: true },
];

const enrichColumns = (cols: any[]): Column[] => {
    return cols.map(col => {
        const typeMatch = PROPERTY_TYPES.find(t => t.id === col.type);
        // Special icons for core columns
        const coreIcons: Record<string, React.ReactNode> = {
            id_req: <Hash size={14} />,
            birth: <Calendar size={14} />,
            passport: <Paperclip size={14} />,
            passportIssue: <Calendar size={14} />,
            passportExpiry: <Calendar size={14} />,
            nationality: <MapPin size={14} />,
            nationalId: <CheckSquare size={14} />,
            employer: <Briefcase size={14} />,
            jobTitle: <User size={14} />,
            placeOfBirth: <MapPin size={14} />,
            travelDate: <Calendar size={14} />,
            returnDate: <Calendar size={14} />,
            gender: <User size={14} />,
            embassy: <Briefcase size={14} />,
            location: <MapPin size={14} />,
            maritalStatus: <Heart size={14} />,
            sponsorship: <Briefcase size={14} />,
            appointmentDate: <Clock size={14} />,
            source: <UserCircle size={14} />,
        };
        return {
            ...col,
            icon: coreIcons[col.id] || typeMatch?.icon || <Hash size={14} />
        };
    });
};

import { Case, Applicant, Country, Appointment, Location as AppLocation, Agency } from "@/lib/storage/types";

// --- Sortable Row Component ---
function SortableRow({
    record,
    idx,
    columns,
    selectedRows,
    toggleSelectRow,
    editingCell,
    setEditingCell,
    activeStatusPicker,
    setActiveStatusPicker,
    updateCell,
    STATUSES,
    handleStatusUpdate,
    setSelectedCase,
    statusPickerRef,
    hoveredCaseId,
    setHoveredCaseId
}: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: record.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: (isDragging ? 'relative' : 'static') as any,
        zIndex: isDragging ? 9999 : 1,
        backgroundColor: isDragging ? 'white' : 'transparent',
        boxShadow: isDragging ? '0 10px 40px rgba(0,0,0,0.1)' : 'none',
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={cn(
                "transition-colors group border-b border-gray-100 last:border-b-0 cursor-default relative",
                // Base white background unless overridden
                !selectedRows.has(record.id) && "bg-white",
                // Hover effect for the row itself
                "hover:bg-gray-50",
                // Selection overrides everything
                selectedRows.has(record.id) && "!bg-blue-50/50",
                isDragging && "!bg-white shadow-xl z-50",

                // Group Highlight Logic
                // If this row's Case ID matches the hovered one, AND it is not selected
                (hoveredCaseId && record.caseId && hoveredCaseId === record.caseId && !selectedRows.has(record.id)) && "!bg-amber-50",

                // Border Strip Logic
                (hoveredCaseId && record.caseId && hoveredCaseId === record.caseId) ? "border-l-[4px] border-l-amber-400" : "border-l-[4px] border-l-transparent"
            )}
            onMouseEnter={() => setHoveredCaseId && setHoveredCaseId(record.caseId)}
            onMouseLeave={() => setHoveredCaseId && setHoveredCaseId(null)}
        >
            <td
                className={cn(
                    "w-16 border-l border-gray-100 sticky right-0 bg-inherit z-10 transition-colors text-center relative cursor-pointer",
                )}
                onClick={(e) => toggleSelectRow(record.id, e.shiftKey)}
            >
                {/* --- Row Index / Interactions Layout --- */}
                <div className="flex items-center justify-center h-full w-full relative">
                    {/* 1. The Row Number (Visible by default) */}
                    <span className={cn(
                        "text-[11px] text-gray-300 font-bold transition-opacity duration-200",
                        (selectedRows.has(record.id)) ? "opacity-0" : "group-hover:opacity-0"
                    )}>
                        {idx + 1}
                    </span>

                    {/* 2. The Interactive Layer (Grip + Checkbox) - Visible on Hover or Selection */}
                    <div className={cn(
                        "absolute inset-0 flex items-center justify-center gap-0.5 transition-opacity duration-200 bg-inherit",
                        selectedRows.has(record.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                        {/* THE GRIP - Reorder Handle */}
                        <button
                            {...attributes}
                            {...listeners}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-900 transition-all cursor-grab active:cursor-grabbing"
                        >
                            <Icon icon={GripVertical} size={14} />
                        </button>

                        {/* THE CHECKBOX - Selection Handle */}
                        <div className="flex items-center justify-center w-6 h-6">
                            <input
                                type="checkbox"
                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                checked={selectedRows.has(record.id)}
                                onChange={() => { }} // Managed by td onClick
                            />
                        </div>
                    </div>
                </div>
            </td>

            {columns.filter((c: any) => c.visible).map((col: any) => {
                const currentStatus = STATUSES.find((s: any) => s.id === record.statusId) || STATUSES[0];
                return (
                    <td
                        key={col.id}
                        className={cn(
                            "px-4 py-2.5 border-l border-gray-100 transition-all relative",
                            (editingCell?.rowId === record.id && editingCell?.colId === col.id) || (activeStatusPicker?.rowId === record.id && activeStatusPicker?.colId === col.id) ? "z-[60] overflow-visible" : "z-0",
                            editingCell?.rowId === record.id && editingCell?.colId === col.id && "bg-white shadow-[inset_0_0_0_2px_rgba(59,130,246,0.2)]"
                        )}
                        onClick={() => {
                            if (col.type === "status") {
                                setActiveStatusPicker({ rowId: record.id, colId: col.id });
                            } else if (col.type !== "date") {
                                setEditingCell({ rowId: record.id, colId: col.id });
                            }
                        }}
                    >
                        <div className="min-h-[32px] flex items-center">
                            {editingCell?.rowId === record.id && editingCell?.colId === col.id ? (
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full bg-transparent border-none outline-none text-[13px] text-gray-900"
                                    value={(record as any)[col.id] || ""}
                                    onChange={(e) => updateCell(record.id, col.id, e.target.value)}
                                    onBlur={() => setEditingCell(null)}
                                    onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                                />
                            ) : (
                                <div className="w-full flex items-center justify-between group/cell relative">
                                    {col.id === "status" ? (
                                        <div className="relative">
                                            <div className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all hover:brightness-95",
                                                currentStatus.color
                                            )}>
                                                <div className={cn("w-1 h-1 rounded-full", currentStatus.dot)} />
                                                {currentStatus.label}
                                                <Icon icon={ChevronDown} size={10} className="opacity-40" />
                                            </div>

                                            {/* --- STATUS PICKER POPOVER --- */}
                                            {activeStatusPicker?.rowId === record.id && (
                                                <div
                                                    ref={statusPickerRef}
                                                    className="absolute right-0 top-full mt-1.5 w-40 bg-white shadow-[0_10px_25px_rgba(0,0,0,0.15)] border border-gray-100 rounded-lg z-[200] overflow-hidden py-1 animate-in fade-in zoom-in-95"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {STATUSES.map((s: any) => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => handleStatusUpdate(record.id, s.id)}
                                                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors text-[12px] font-medium text-gray-700 text-right group"
                                                        >
                                                            <div className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
                                                            <span className="grow">{s.label}</span>
                                                            {record.statusId === s.id && <Icon icon={Check} size={12} className="text-blue-500" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : col.type === 'date' ? (
                                        <CustomDatePicker
                                            value={(record as any)[col.id] ? new Date((record as any)[col.id]) : undefined}
                                            onChange={(date) => updateCell(record.id, col.id, date ? date.toISOString().split('T')[0] : "")}
                                            className="w-full h-full justify-start p-0 px-0 rounded-none border-none hover:bg-transparent shadow-none font-normal text-[13px] text-gray-700 bg-transparent"
                                            placeholder="اختر..."
                                        />
                                    ) : (
                                        <div className="flex-1 overflow-hidden flex items-center justify-between group/val">
                                            <span className="flex-1 truncate">{col.id === 'embassy' && (record as any).embassyCode ? (
                                                <span className="flex items-center gap-2">
                                                    <span className={`fi fi-${(record as any).embassyCode} rounded-sm shadow-sm text-base`} />
                                                    <span className="leading-relaxed">{(record as any)[col.id]}</span>
                                                </span>
                                            ) : col.id === 'source' ? (
                                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100 shadow-sm transition-transform hover:scale-105 cursor-help" title="تم الإنشاء بواسطة">
                                                    <UserCircle size={12} className="opacity-70" />
                                                    <span className="text-[11px] font-bold truncate max-w-[100px]">{(record as any).source}</span>
                                                </div>
                                            ) : col.id === 'birth' && (record as any).ageInfo ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="leading-relaxed">{(record as any)[col.id]}</span>
                                                    <span
                                                        className={cn(
                                                            "inline-flex items-center justify-center w-6 h-6 rounded-full text-[13px] transition-transform hover:scale-110 cursor-help",
                                                            (record as any).ageInfo.bg
                                                        )}
                                                        title={`${(record as any).age} سنة (${(record as any).ageInfo.label})`}
                                                    >
                                                        {(record as any).ageInfo.emoji}
                                                    </span>
                                                </span>
                                            ) : col.id === 'gender' ? (
                                                (record as any)[col.id] === 'M' ? 'ذكر' : (record as any)[col.id] === 'F' ? 'أنثى' : (record as any)[col.id] || <span className="text-gray-100 opacity-20 select-none">ـ</span>
                                            ) : col.id === 'maritalStatus' ? (
                                                (record as any)[col.id] === 'SINGLE' ? 'أعزب/عزباء' : (record as any)[col.id] === 'MARRIED' ? 'متزوج/ـة' : (record as any)[col.id] || <span className="text-gray-100 opacity-20 select-none">ـ</span>
                                            ) : col.id === 'sponsorship' ? (
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900 leading-tight">{(record as any)[col.id]?.split('|')[0]}</span>
                                                    {(record as any)[col.id]?.includes('|') && (
                                                        <span className="text-[10px] text-gray-400 mt-0.5 leading-tight truncate max-w-[150px]" title={(record as any)[col.id]?.split('|')[1]}>
                                                            {(record as any)[col.id]?.split('|')[1]}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                (record as any)[col.id] || <span className="text-gray-100 opacity-20 select-none">ـ</span>
                                            )}
                                            </span>

                                            {col.id === "id_req" && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedCase(record); }}
                                                    className="absolute left-1 flex items-center gap-1 px-1.5 py-0.5 bg-white border border-gray-100 rounded shadow-[0_1px_3px_rgba(0,0,0,0.05)] text-gray-500 text-[11px] font-medium opacity-0 group-hover/val:opacity-100 transition-all hover:bg-gray-50 active:scale-95 z-10"
                                                >
                                                    <span>فتح</span>
                                                    <Icon icon={PanelLeft} size={14} className="text-gray-400" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </td>
                );
            })}
            <td className="w-24 border-gray-100"></td>
            <td className="grow"></td>
        </tr>
    );
}

export function OperationalSheet({
    cases: initialCases,
    countries = [],
    appointments = [],
    locations = [],
    agencies = []
}: {
    cases: Case[],
    countries?: Country[],
    appointments?: Appointment[],
    locations?: AppLocation[],
    agencies?: Agency[]
}) {
    const router = useRouter();
    const [columns, setColumns] = useState<Column[]>(enrichColumns(DEFAULT_COLUMNS));

    useEffect(() => {
        const saved = localStorage.getItem('tejwal_ops_sheet_cols');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);

                // Deduplicate by ID to fix any corrupted cache
                const uniqueParsed = parsed.filter((c: any, index: number, self: any[]) =>
                    index === self.findIndex((t: any) => t.id === c.id)
                );

                // Merge logic: ensure new default columns exist even if user has saved state
                const merged = [...uniqueParsed];
                DEFAULT_COLUMNS.forEach(defCol => {
                    if (!merged.find(c => c.id === defCol.id)) {
                        merged.push(defCol);
                    }
                });
                setColumns(enrichColumns(merged));
            } catch (e) {
                console.error("Failed to load columns", e);
            }
        }
    }, []);

    // Helper to format ISO dates to YYYY-MM-DD
    const formatDate = (dateStr?: string) => {
        if (!dateStr || typeof dateStr !== 'string') return "";
        // If it's already YYYY-MM-DD, just return it
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        // If it's ISO, take the first 10 chars
        if (dateStr.includes('T')) return dateStr.split('T')[0];

        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toISOString().split('T')[0];
        } catch (e) {
            return dateStr;
        }
    };

    // Age Calculation Helpers
    const calculateAgeAtDate = (birthDate: string, refDate: string) => {
        if (!birthDate || !refDate) return null;
        const birth = new Date(birthDate);
        const ref = new Date(refDate);
        if (isNaN(birth.getTime()) || isNaN(ref.getTime())) return null;

        let age = ref.getFullYear() - birth.getFullYear();
        const m = ref.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
        return Math.max(0, age);
    };

    const getAgeInfo = (age: number | null) => {
        if (age === null) return null;
        if (age < 2) return { emoji: "🍼", label: "رضيع", color: "text-orange-600", bg: "bg-orange-50" };
        if (age < 12) return { emoji: "🧸", label: "طفل", color: "text-green-600", bg: "bg-green-50" };
        return { emoji: "👤", label: "بالغ", color: "text-gray-400", bg: "bg-gray-50" };
    };

    // Map cases to table rows (flattened)
    const mapCaseToRow = (c: Case, a: Applicant) => {
        const appointment = appointments.find(ap => ap.id === c.appointmentId);
        let country = countries.find(co => co.id === appointment?.countryId);

        // Fallback: if no appointment, try to find country by name from the case embassy field if it exists
        if (!country && (c as any).embassy) {
            country = countries.find(co => co.name_ar === (c as any).embassy);
        }

        const embassyName = country?.name_ar || (c as any).embassy || "";
        const embassyCode = country?.iso_code?.toLowerCase() ||
            (country?.code === 'SPAIN' ? 'es' :
                country?.code === 'FRANCE' ? 'fr' :
                    embassyName.includes('إسبانيا') || embassyName.includes('اسبانيا') || embassyName.includes('أسبانيا') ? 'es' :
                        embassyName.includes('فرنسا') ? 'fr' : null);

        const birthDate = formatDate(a.birthDate);
        const appointmentDate = formatDate(appointment?.date);
        const age = calculateAgeAtDate(birthDate, appointmentDate);
        const ageInfo = getAgeInfo(age);


        // Strict Display Logic (User Request):
        // If sponsorship is NOT 'Self Sponsored', DO NOT show employment details (Employer/Job).
        // This hides employment for dependents or externally sponsored.
        let showEmployment = false;

        if (a.sponsorship === 'كفالة ذاتية') {
            showEmployment = true;
        } else if (!a.sponsorship && a.type === 'MAIN') {
            // Fallback: If no sponsorship info, assume Main applicant is self-sponsored
            showEmployment = true;
        }

        return {
            ...a,
            id: a.id,
            caseId: c.id,
            id_req: c.fileNumber,
            name: a.nameInPassport || "",
            passport: a.passportNumber || "",
            passportIssue: formatDate(a.passportIssueDate),
            passportExpiry: formatDate(a.passportExpiryDate),
            nationality: a.nationality || "",
            phone: c.phone || a.mobileNumber || "",
            status: c.statusId,
            birth: birthDate,
            age: age,
            ageInfo: ageInfo,

            // Employment Columns: Show if data exists
            employer: showEmployment ? (a.employerEn || "") : "",
            jobTitle: showEmployment ? (a.jobTitleEn || "") : "",

            isSponsored: !showEmployment,
            sponsorshipDetails: a.sponsorship,

            placeOfBirth: a.placeOfBirthEn || "",
            travelDate: formatDate(c.travelDate),
            returnDate: formatDate(c.returnDate),
            gender: a.gender || "",
            maritalStatus: a.maritalStatus || "",
            embassy: embassyName,
            embassyCode: embassyCode,
            location: locations.find(lo => lo.id === appointment?.locationId)?.name_ar || "",
            appointmentDate: appointmentDate,
            sponsorship: a.sponsorship || (a.type === 'MAIN' ? 'كفالة ذاتية' : 'مرافق'),
            source: (c as any).createdById ? ((c as any).createdBy || 'موظف') : (
                agencies.find(ag => ag.id === c.agencyId)?.name || (c.agencyId === 'tejwal' ? 'النظام' : 'وكالة')
            ),
        };
    };
    const [cases, setCases] = useState<any[]>(initialCases.flatMap(c => (c.applicants || []).map(a => mapCaseToRow(c, a))));
    const [isColMenuOpen, setIsColMenuOpen] = useState<string | null>(null);
    const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(false);
    const [activeStatusPicker, setActiveStatusPicker] = useState<{ rowId: string, colId: string } | null>(null);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [lastSelectedRow, setLastSelectedRow] = useState<string | null>(null);
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [bulkEditCol, setBulkEditCol] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const bulkEditRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);
    const [past, setPast] = useState<any[][]>([]);
    const [future, setFuture] = useState<any[][]>([]);

    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [draggedCol, setDraggedCol] = useState<string | null>(null);
    const [resizingCol, setResizingCol] = useState<{ id: string, startX: number, startWidth: number } | null>(null);
    const [hoveredCaseId, setHoveredCaseId] = useState<string | null>(null); // New state for group hover

    // Idea 2: Interactive Cell State
    const [editingCell, setEditingCell] = useState<{ rowId: string, colId: string } | null>(null);

    // Filtering & Search State
    const [filterSpec, setFilterSpec] = useState<FilterSpec>({ type: "group", operator: "and", filters: [] });
    const [searchQuery, setSearchQuery] = useState("");
    const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

    const filteredCases = useMemo(() => {
        return cases.filter(row => {
            // Memory filter (Notion-like)
            const matchesFilter = evaluateRow(row as any, filterSpec);

            // Search query (global across name/phone/fileNumber)
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery ||
                (row as any).fileNumber?.toLowerCase().includes(searchLower) ||
                (row as any).name?.toLowerCase().includes(searchLower) ||
                (row as any).phone?.toLowerCase().includes(searchLower) ||
                (row as any).passport?.toLowerCase().includes(searchLower) ||
                (row as any).nationalId?.toLowerCase().includes(searchLower);

            return matchesFilter && matchesSearch;
        });
    }, [cases, filterSpec, searchQuery]);

    const colOptionsRef = useRef<HTMLDivElement>(null);
    const visibilityMenuRef = useRef<HTMLDivElement>(null);
    const statusPickerRef = useRef<HTMLDivElement>(null);

    const handleDragStart = (id: string) => {
        setDraggedCol(id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (targetId: string) => {
        if (!draggedCol || draggedCol === targetId) return;
        const draggedIdx = columns.findIndex(c => c.id === draggedCol);
        const targetIdx = columns.findIndex(c => c.id === targetId);

        const newCols = [...columns];
        const [removed] = newCols.splice(draggedIdx, 1);
        newCols.splice(targetIdx, 0, removed);

        setColumns(newCols);
        setDraggedCol(null);
    };

    const handleResizeStart = (e: React.MouseEvent, id: string, currentWidth: number) => {
        e.stopPropagation();
        e.preventDefault();
        setResizingCol({ id, startX: e.clientX, startWidth: currentWidth });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingCol) return;
            // In RTL, dragging to the Left (negative delta) increases width
            const delta = resizingCol.startX - e.clientX;
            const newWidth = Math.max(50, resizingCol.startWidth + delta);
            setColumns(prev => prev.map(c => c.id === resizingCol.id ? { ...c, width: newWidth } : c));
        };

        const handleMouseUp = () => {
            setResizingCol(null);
        };

        if (resizingCol) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        } else {
            document.body.style.cursor = 'default';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingCol]);

    useEffect(() => {
        const toSave = columns.map(({ icon, ...rest }) => rest);
        localStorage.setItem('tejwal_ops_sheet_cols', JSON.stringify(toSave));
    }, [columns]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (colOptionsRef.current && !colOptionsRef.current.contains(event.target as Node)) setIsColMenuOpen(null);
            if (visibilityMenuRef.current && !visibilityMenuRef.current.contains(event.target as Node)) setIsVisibilityMenuOpen(false);
            if (statusPickerRef.current && !statusPickerRef.current.contains(event.target as Node)) setActiveStatusPicker(null);
            if (bulkEditRef.current && !bulkEditRef.current.contains(event.target as Node)) {
                setIsBulkEditOpen(false);
                setBulkEditCol(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);






    const toggleVisibility = (id: string) => {
        if (id === "id_req") return; // Non-hideable
        setColumns(columns.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
    };

    // History & Undo/Redo Logic
    const saveAndSetCases = (newCases: Case[]) => {
        setPast(prev => [cases, ...prev].slice(0, 50));
        setFuture([]); // Clear redo stack on new action
        setCases(newCases);
    };

    const undo = () => {
        if (past.length === 0) return;
        const previous = past[0];
        const newPast = past.slice(1);

        setFuture(prev => [cases, ...prev]);
        setCases(previous);
        setPast(newPast);
    };

    const redo = () => {
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);

        setPast(prev => [cases, ...prev]);
        setCases(next);
        setFuture(newFuture);
    };

    const deleteColumn = (id: string) => {
        if (id === "id_req") return;
        setColumns(columns.filter(c => c.id !== id));
        setIsColMenuOpen(null);
    };

    const updateColLabel = (id: string, newLabel: string) => {
        setColumns(columns.map(c => c.id === id ? { ...c, label: newLabel } : c));
    };

    const deleteRow = async (id: string) => {
        // id here is the Applicant ID (Row ID). But to delete the whole case, we need the Case ID.
        // Find the record to get its Case ID
        const targetRecord = cases.find(c => c.id === id);
        if (!targetRecord) return;

        const caseIdToDelete = targetRecord.caseId;

        // Optimistic update: Remove ALL rows belonging to this Case ID
        saveAndSetCases(cases.filter(c => c.caseId !== caseIdToDelete));
        try {
            await deleteCaseAction(caseIdToDelete);
        } catch (e) {
            console.error("Failed to delete case", e);
            // Revert if failed (but saveAndSetCases adds to history, so undo could be manual)
        }
    };

    const duplicateRow = (row: Case) => {
        const newRow = { ...row, id: `row_${Date.now()}`, createdAt: new Date().toISOString() };
        saveAndSetCases([newRow, ...cases]);
    };



    const updateCell = async (rowId: string, field: string, value: string) => {
        // Prepare new state
        const newCases = cases.map(c => {
            if (c.id === rowId) {
                const updated = { ...c, [field]: value };
                // Re-derive embassy code if embassy name changes manually
                if (field === 'embassy') {
                    const country = countries.find(co => co.name_ar === value);
                    const code = country?.iso_code?.toLowerCase() ||
                        (value.includes('إسبانيا') || value.includes('اسبانيا') || value.includes('أسبانيا') ? 'es' :
                            value.includes('فرنسا') ? 'fr' : null);
                    updated.embassyCode = code;
                }

                // Recalculate age if birth date or appointment date changes
                if (field === 'birth' || field === 'appointmentDate') {
                    const age = calculateAgeAtDate(updated.birth, updated.appointmentDate);
                    updated.age = age;
                    updated.ageInfo = getAgeInfo(age);
                }

                return updated;
            }
            return c;
        });

        // Save to history and state
        saveAndSetCases(newCases);

        try {
            await updateTableCellAction(rowId, field, value);
        } catch (e) {
            console.error("Failed to update cell", e);
        }
    };
    const toggleSelectRow = (id: string, isShift: boolean = false) => {
        const next = new Set(selectedRows);

        if (isShift && lastSelectedRow) {
            const startIdx = filteredCases.findIndex(c => c.id === lastSelectedRow);
            const endIdx = filteredCases.findIndex(c => c.id === id);

            if (startIdx !== -1 && endIdx !== -1) {
                const [min, max] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
                for (let i = min; i <= max; i++) {
                    next.add(filteredCases[i].id);
                }
            }
        } else {
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
        }
        setSelectedRows(next);
        setLastSelectedRow(id);
    };

    const toggleSelectAll = () => {
        if (selectedRows.size === filteredCases.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(filteredCases.map(c => c.id)));
        }
    };

    const bulkDelete = async () => {
        const selectedIds = Array.from(selectedRows);

        // Resolve Unique Case IDs involved
        const caseIdsToDelete = new Set<string>();
        cases.forEach(c => {
            if (selectedIds.includes(c.id)) {
                caseIdsToDelete.add(c.caseId);
            }
        });

        // Optimistic Update: Remove ALL rows belonging to these Case IDs
        // (Even if only 1 applicant was selected, we delete the whole case - per current behavior)
        saveAndSetCases(cases.filter(c => !caseIdsToDelete.has(c.caseId)));
        setSelectedRows(new Set());

        try {
            // Delete unique cases
            await Promise.all(Array.from(caseIdsToDelete).map(id => deleteCaseAction(id)));
        } catch (e) {
            console.error("Failed bulk delete", e);
        }
    };

    const bulkDuplicate = () => {
        const toDup = cases.filter(c => selectedRows.has(c.id));
        const duplicated = toDup.map(c => ({
            ...c,
            id: `row_${Date.now()}_${Math.random()}`,
            createdAt: new Date().toISOString()
        }));
        saveAndSetCases([...duplicated, ...cases]);
        setSelectedRows(new Set());
    };

    const bulkUpdateField = (field: string, value: any) => {
        saveAndSetCases(cases.map(c => selectedRows.has(c.id) ? { ...c, [field]: value } : c));
        setSelectedRows(new Set());
        setBulkEditCol(null);
        setIsBulkEditOpen(false);
    };
    const handleStatusUpdate = (rowId: string, statusId: string) => {
        updateCell(rowId, 'statusId', statusId);
        setActiveStatusPicker(null);
    };

    // --- DND HANDLERS ---
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = cases.findIndex((item) => item.id === active.id);
            const newIndex = cases.findIndex((item) => item.id === over.id);
            const newCases = arrayMove(cases, oldIndex, newIndex);
            saveAndSetCases(newCases);
        }
    };

    // Navigation logic for Side Peek
    const currentIndex = useMemo(() => filteredCases.findIndex(c => c.id === selectedCase?.id), [filteredCases, selectedCase]);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < filteredCases.length - 1 && currentIndex !== -1;

    const goToPrev = () => hasPrev && setSelectedCase(filteredCases[currentIndex - 1]);
    const goToNext = () => hasNext && setSelectedCase(filteredCases[currentIndex + 1]);

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            // Undo shortcut
            if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
                return;
            }
            // Redo shortcut (Ctrl+Y)
            if (e.key === 'y' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                redo();
                return;
            }

            if (!selectedCase) return;
            if (e.key === 'ArrowUp' && (e.metaKey || e.ctrlKey)) goToPrev();
            if (e.key === 'ArrowDown' && (e.metaKey || e.ctrlKey)) goToNext();
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [selectedCase, currentIndex, past, future, cases]);

    return (
        <div className="flex flex-col h-full bg-white transition-all duration-500 select-none relative overflow-hidden" dir="rtl">

            {/* --- HEADER SECTION --- */}
            <header className="px-8 pt-6 pb-2 shrink-0">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">إدارة طلبات الشنغن</h1>
                    <button
                        onClick={() => router.push('/requests/new')}
                        className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all active:scale-95"
                    >
                        <Plus size={16} />
                        <span className="font-bold text-sm">إنشاء طلب جديد</span>
                    </button>
                </div>

                {/* --- FILTER & TOOLS BAR --- */}
                <div className="flex items-center justify-between py-2 border-b border-gray-50 mt-4">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-md focus-within:ring-1 focus-within:ring-blue-200 transition-all">
                            <Search size={14} className="text-gray-400" />
                            <input
                                className="bg-transparent border-none outline-none text-[13px] text-gray-900 placeholder:text-gray-400 w-40"
                                placeholder="بحث..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 hover:bg-gray-100 rounded-md transition-all text-[13px]",
                                isFilterBarOpen ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "text-gray-500"
                            )}
                        >
                            <AlignLeft size={14} />
                            عامل التصفية
                        </button>

                        <div className="w-px h-4 bg-gray-200 mx-1" />

                        {/* Undo/Redo Controls */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={undo}
                                disabled={past.length === 0}
                                title="تراجع عن آخر تعديل (Ctrl+Z)"
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    past.length > 0 ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-200 cursor-not-allowed"
                                )}
                            >
                                <Icon icon={Undo2} size={16} />
                            </button>
                            <button
                                onClick={redo}
                                disabled={future.length === 0}
                                title="إعادة التعديل (Ctrl+Y / Ctrl+Shift+Z)"
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    future.length > 0 ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-200 cursor-not-allowed"
                                )}
                            >
                                <Icon icon={Redo2} size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- NOTION FILTER BAR --- */}
                {isFilterBarOpen && (
                    <FilterBar
                        filterSpec={filterSpec}
                        onChange={setFilterSpec}
                        availableProperties={columns.map(c => ({
                            id: c.id,
                            label: c.label,
                            type: c.type,
                            icon: c.icon
                        }))}
                    />
                )}
            </header>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 flex flex-col overflow-auto scrollbar-hide border-t border-gray-100">
                <div className="inline-block align-middle min-w-full">
                    {!mounted ? (
                        <table className="min-w-full border-separate border-spacing-0 table-fixed">
                            <thead>
                                <tr className="border-b border-gray-100 bg-white group/head">
                                    <th className="w-16 border-b border-l border-gray-100 bg-white sticky right-0 z-30 transition-colors group-hover/head:bg-gray-50/30 flex items-center justify-center h-[41px]">
                                        <Icon icon={Sigma} className="text-gray-400 group-hover/head:text-gray-900 transition-colors" />
                                    </th>
                                    {columns.map(col => (
                                        <th key={col.id} className="border-b border-l border-gray-100 bg-white px-3 py-2 text-right relative group/col">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <span>{col.icon}</span>
                                                <span className="text-[12px] font-bold truncate">{col.label}</span>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="grow bg-white border-b border-gray-100"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {filteredCases.map((record, idx) => (
                                    <SortableRow
                                        key={record.id}
                                        record={record}
                                        idx={idx}
                                        columns={columns}
                                        selectedRows={selectedRows}
                                        toggleSelectRow={toggleSelectRow}
                                        deleteRow={deleteRow}
                                        duplicateRow={duplicateRow}
                                        editingCell={editingCell}
                                        setEditingCell={setEditingCell}
                                        activeStatusPicker={activeStatusPicker}
                                        setActiveStatusPicker={setActiveStatusPicker}
                                        updateCell={updateCell}
                                        STATUSES={STATUSES}
                                        handleStatusUpdate={handleStatusUpdate}
                                        setSelectedCase={setSelectedCase}
                                        statusPickerRef={statusPickerRef}
                                        hoveredCaseId={hoveredCaseId}
                                        setHoveredCaseId={setHoveredCaseId}
                                    />
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
                        >
                            <table className="min-w-full border-separate border-spacing-0 table-fixed">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-white group/head">
                                        <th
                                            className="w-16 border-b border-l border-gray-100 bg-white sticky right-0 z-30 transition-colors group-hover/head:bg-gray-50/30 flex items-center justify-center h-[41px]"
                                            onDragOver={handleDragOver}
                                            onDrop={() => handleDrop(columns[0]?.id || '')} // Drop on index makes it the new first column
                                        >
                                            <input
                                                type="checkbox"
                                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                checked={selectedRows.size === filteredCases.length && filteredCases.length > 0}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        {columns.filter(c => c.visible).map((col) => (
                                            <th
                                                key={col.id}
                                                style={{ width: col.width }}
                                                className={cn(
                                                    "text-right border-b border-l border-gray-100 bg-white relative group/header transition-all cursor-move hover:bg-gray-50/50",
                                                    draggedCol === col.id ? "opacity-20" : "opacity-100",
                                                    isColMenuOpen === col.id ? "z-[50] overflow-visible" : "z-20 overflow-hidden"
                                                )}
                                                draggable
                                                onDragStart={() => handleDragStart(col.id)}
                                                onDragEnd={() => setDraggedCol(null)}
                                                onDragOver={handleDragOver}
                                                onDrop={() => handleDrop(col.id)}
                                                onClick={() => setIsColMenuOpen(col.id)}
                                            >
                                                <div className="flex items-center gap-2 px-4 py-2.5 overflow-hidden">
                                                    <span className="shrink-0 text-gray-400 group-hover/header:text-gray-900 transition-colors">{col.icon}</span>
                                                    <span className="text-[13px] font-medium text-gray-400 group-hover/header:text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis transition-colors">{col.label}</span>
                                                </div>

                                                {/* Resize Handle */}
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400 transition-colors z-[100]"
                                                    onMouseDown={(e) => handleResizeStart(e, col.id, col.width)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                {isColMenuOpen === col.id && (
                                                    <div ref={colOptionsRef} className="absolute right-0 top-full mt-1 w-60 bg-white shadow-2xl border border-gray-200 rounded-xl z-[100] overflow-hidden py-1.5 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                                                        <div className="px-2 pb-2 mb-1 border-b border-gray-50"><input autoFocus className="bg-gray-50 w-full px-2 py-1.5 rounded-lg border-none text-[13px] font-bold text-gray-900 text-right" value={col.label} onChange={(e) => updateColLabel(col.id, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setIsColMenuOpen(null)} /></div>
                                                        <button
                                                            onClick={() => toggleVisibility(col.id)}
                                                            className={cn("w-full flex items-center gap-3 px-3 py-1.5 hover:bg-gray-50 text-[13px] text-gray-600 text-right", col.id === "id_req" && "opacity-30 cursor-not-allowed")}
                                                            disabled={col.id === "id_req"}
                                                        >
                                                            <EyeOff size={14} className="text-gray-400" /> إخفاء من العرض
                                                        </button>
                                                        <button
                                                            onClick={() => deleteColumn(col.id)}
                                                            className={cn("w-full flex items-center gap-3 px-3 py-1.5 hover:bg-red-50 text-[13px] text-red-500 text-right group", col.id === "id_req" && "opacity-30 cursor-not-allowed")}
                                                            disabled={col.id === "id_req"}
                                                        >
                                                            <Trash2 size={14} className="text-red-300 group-hover:text-red-500" /> حذف الخاصية
                                                        </button>
                                                    </div>
                                                )}
                                            </th>
                                        ))}
                                        <th className="w-24 border-b border-gray-100 bg-white relative z-20">
                                            <div className="flex items-center h-full px-2 gap-1 relative">
                                                <button onClick={() => setIsVisibilityMenuOpen(!isVisibilityMenuOpen)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"><MoreHorizontal size={16} /></button>


                                                {/* --- VISIBILITY MENU --- */}
                                                {isVisibilityMenuOpen && (
                                                    <div ref={visibilityMenuRef} className="absolute left-0 top-full mt-2 w-72 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-200 rounded-2xl z-[150] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 backdrop-blur-xl">
                                                        {/* Header */}
                                                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                                                            <div className="flex items-center gap-2">
                                                                <ArrowLeft size={16} className="text-gray-400 cursor-pointer hover:text-gray-900 transition-colors rotate-180" onClick={() => setIsVisibilityMenuOpen(false)} />
                                                                <span className="text-[13px] font-bold text-gray-900">رؤية الخاصية</span>
                                                            </div>
                                                            <X size={16} className="text-gray-300 cursor-pointer hover:text-gray-900 transition-colors" onClick={() => setIsVisibilityMenuOpen(false)} />
                                                        </div>

                                                        <div className="max-h-[400px] overflow-auto scrollbar-hide py-2">
                                                            {/* Visible Section */}
                                                            <div className="px-4 py-1.5 flex items-center justify-between group/sec">
                                                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">يظهر في الجدول</span>
                                                                <button
                                                                    onClick={() => setColumns(columns.map(c => ({ ...c, visible: false })))}
                                                                    className="text-[10px] font-bold text-blue-500 hover:text-blue-700 opacity-0 group-hover/sec:opacity-100 transition-all focus:outline-none"
                                                                >
                                                                    إخفاء الكل
                                                                </button>
                                                            </div>
                                                            {columns.filter(c => c.visible).map(col => (
                                                                <div
                                                                    key={col.id}
                                                                    draggable
                                                                    onDragStart={() => handleDragStart(col.id)}
                                                                    onDragEnd={() => setDraggedCol(null)}
                                                                    onDragOver={handleDragOver}
                                                                    onDrop={() => handleDrop(col.id)}
                                                                    className={cn(
                                                                        "flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors group/item cursor-move",
                                                                        draggedCol === col.id && "opacity-20"
                                                                    )}
                                                                >
                                                                    <GripHorizontal size={14} className="text-gray-200" />
                                                                    <button
                                                                        onClick={() => toggleVisibility(col.id)}
                                                                        className={cn("p-1 hover:bg-gray-100 rounded transition-colors", col.id === "id_req" ? "text-blue-500 cursor-default" : "text-gray-400 hover:text-gray-900")}
                                                                        disabled={col.id === "id_req"}
                                                                    >
                                                                        <Eye size={14} />
                                                                    </button>
                                                                    <span className="shrink-0 text-gray-400">{col.icon}</span>
                                                                    <span className="flex-1 text-[13px] text-gray-700 font-medium text-right truncate">{col.label}</span>
                                                                </div>
                                                            ))}

                                                            <div className="h-4" />

                                                            {/* Hidden Section */}
                                                            <div className="px-4 py-1.5 flex items-center justify-between group/sec">
                                                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">مخفي في الجدول</span>
                                                                <button
                                                                    onClick={() => setColumns(columns.map(c => c.id === "id_req" ? c : ({ ...c, visible: true })))}
                                                                    className="text-[10px] font-bold text-blue-500 hover:text-blue-700 opacity-0 group-hover/sec:opacity-100 transition-all focus:outline-none"
                                                                >
                                                                    إظهار الكل
                                                                </button>
                                                            </div>
                                                            {columns.filter(c => !c.visible).map(col => (
                                                                <div
                                                                    key={col.id}
                                                                    draggable
                                                                    onDragStart={() => handleDragStart(col.id)}
                                                                    onDragEnd={() => setDraggedCol(null)}
                                                                    onDragOver={handleDragOver}
                                                                    onDrop={() => handleDrop(col.id)}
                                                                    className={cn(
                                                                        "flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors group/item cursor-move opacity-60 grayscale-[0.5]",
                                                                        draggedCol === col.id && "opacity-20"
                                                                    )}
                                                                >
                                                                    <GripHorizontal size={14} className="text-gray-200" />
                                                                    <button
                                                                        onClick={() => toggleVisibility(col.id)}
                                                                        className={cn("p-1 hover:bg-gray-100 rounded transition-colors", col.id === "id_req" ? "text-blue-500 cursor-default" : "text-gray-300 hover:text-gray-600")}
                                                                        disabled={col.id === "id_req"}
                                                                    >
                                                                        <EyeOff size={14} />
                                                                    </button>
                                                                    <span className="shrink-0 text-gray-400">{col.icon}</span>
                                                                    <span className="flex-1 text-[13px] text-gray-500 font-medium text-right truncate">{col.label}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}


                                            </div>
                                        </th>
                                        <th className="grow bg-white border-b border-gray-100"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    <SortableContext
                                        items={filteredCases.map(c => c.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {filteredCases.map((record, idx) => (
                                            <SortableRow
                                                key={record.id}
                                                record={record}
                                                idx={idx}
                                                columns={columns}
                                                selectedRows={selectedRows}
                                                toggleSelectRow={toggleSelectRow}
                                                deleteRow={deleteRow}
                                                duplicateRow={duplicateRow}
                                                editingCell={editingCell}
                                                setEditingCell={setEditingCell}
                                                activeStatusPicker={activeStatusPicker}
                                                setActiveStatusPicker={setActiveStatusPicker}
                                                updateCell={updateCell}
                                                STATUSES={STATUSES}
                                                handleStatusUpdate={handleStatusUpdate}
                                                setSelectedCase={setSelectedCase}
                                                statusPickerRef={statusPickerRef}
                                                hoveredCaseId={hoveredCaseId}
                                                setHoveredCaseId={setHoveredCaseId}
                                            />
                                        ))}
                                    </SortableContext>
                                </tbody>
                            </table>
                        </DndContext>
                    )}
                </div>
            </main>

            {/* --- SIDE PEEK PANEL --- */}
            <div className={cn("fixed top-0 left-0 bottom-0 w-[500px] bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-[200] border-r border-gray-200 transition-transform duration-300 ease-out transform flex flex-col p-8", selectedCase ? "translate-x-0" : "-translate-x-full")}>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedCase(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-all">
                            <Icon icon={ArrowLeft} size={20} className="rotate-180" />
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg text-gray-500 font-bold text-xs transition-all">
                            <Icon icon={ExternalLink} /> فتح كصفحة
                        </button>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-1 border-l border-gray-100 pl-4">
                        <button
                            disabled={!hasPrev}
                            onClick={goToPrev}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                hasPrev ? "text-gray-400 hover:text-gray-900 hover:bg-gray-100" : "text-gray-100 cursor-not-allowed"
                            )}
                            title="الطلب السابق (Ctrl+↑)"
                        >
                            <Icon icon={ChevronUp} size={18} />
                        </button>
                        <button
                            disabled={!hasNext}
                            onClick={goToNext}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                hasNext ? "text-gray-400 hover:text-gray-900 hover:bg-gray-100" : "text-gray-100 cursor-not-allowed"
                            )}
                            title="الطلب التالي (Ctrl+↓)"
                        >
                            <Icon icon={ChevronDown} size={18} />
                        </button>
                    </div>
                </div>
                <div className="mb-10"><input className="text-4xl font-black text-gray-900 border-none outline-none w-full bg-transparent placeholder:text-gray-100" placeholder="بدون عنوان" value={(selectedCase as any)?.name || ""} onChange={(e) => updateCell(selectedCase!.id, 'name', e.target.value)} /></div>
                <div className="space-y-4">
                    {columns.map(col => (
                        <div key={col.id} className="flex items-center group/prop">
                            <div className="w-40 flex items-center gap-2 text-gray-400 group-hover/prop:text-gray-900 transition-colors"><span className="p-1 rounded bg-gray-50">{col.icon}</span><span className="text-sm font-bold">{col.label}</span></div>
                            <div className="flex-1"><input className="w-full px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-100 focus:bg-gray-50/50 outline-none text-sm text-gray-700 transition-all" value={(selectedCase as any)?.[col.id] || ""} placeholder="فارغ" onChange={(e) => updateCell(selectedCase!.id, col.id, e.target.value)} /></div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedCase && <div className="fixed inset-0 bg-black/5 backdrop-blur-[2px] z-[190] animate-in fade-in" onClick={() => setSelectedCase(null)} />}





            {/* --- FLOATING BULK ACTIONS BAR --- */}
            {selectedRows.size > 0 && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-white border border-gray-200 shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-xl flex items-center gap-1 p-1 z-[300] animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <div className="flex items-center gap-2 px-3 py-1.5 border-l border-gray-100 ml-1">
                        <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md min-w-[20px] text-center">
                            {selectedRows.size}
                        </span>
                        <span className="text-[13px] font-bold text-gray-700">مختار</span>
                    </div>

                    <div className="flex items-center">
                        {/* Edit Property */}
                        <div className="relative">
                            <button
                                onClick={() => setIsBulkEditOpen(!isBulkEditOpen)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-all text-[13px] font-bold",
                                    isBulkEditOpen ? "bg-gray-100 text-gray-900" : "text-gray-500"
                                )}
                            >
                                <Icon icon={AlignLeft} size={14} className="text-gray-400" />
                                <span>تعديل خاصية</span>
                            </button>

                            {isBulkEditOpen && (
                                <div
                                    ref={bulkEditRef}
                                    className="absolute bottom-full mb-2 right-0 w-52 bg-white shadow-2xl border border-gray-200 rounded-xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95"
                                >
                                    {!bulkEditCol ? (
                                        <>
                                            <div className="px-3 py-1.5 text-[10px] font-black text-gray-300 uppercase tracking-widest text-right">اختر الخاصية للتعديل</div>
                                            {columns.map(col => (
                                                <button
                                                    key={col.id}
                                                    onClick={() => setBulkEditCol(col.id)}
                                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-[13px] text-gray-600 text-right group"
                                                >
                                                    <span className="text-gray-400 group-hover:text-gray-900 transition-colors">{col.icon}</span>
                                                    <span className="flex-1 font-medium">{col.label}</span>
                                                </button>
                                            ))}
                                        </>
                                    ) : (
                                        <div className="p-1">
                                            <button onClick={() => setBulkEditCol(null)} className="w-full flex items-center gap-2 px-3 py-1 text-[10px] text-blue-500 font-bold hover:underline mb-1">
                                                <Icon icon={ArrowLeft} size={10} className="rotate-180" /> رجوع
                                            </button>
                                            {columns.find(c => c.id === bulkEditCol)?.type === 'status' ? (
                                                STATUSES.map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => bulkUpdateField(bulkEditCol!, s.id)}
                                                        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 transition-colors text-[13px] font-medium text-gray-700 text-right group"
                                                    >
                                                        <div className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
                                                        <span>{s.label}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-2">
                                                    <input
                                                        autoFocus
                                                        className="w-full px-2 py-1.5 bg-gray-50 border-none rounded text-[13px] outline-none"
                                                        placeholder="أدخل القيمة الجديدة..."
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') bulkUpdateField(bulkEditCol!, (e.target as HTMLInputElement).value);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={bulkDuplicate}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 text-gray-500 rounded-lg transition-all text-[13px] font-bold group"
                        >
                            <Icon icon={Copy} size={14} className="text-gray-400 group-hover:text-gray-900" />
                            <span>تكرار</span>
                        </button>

                        <button
                            onClick={bulkDelete}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-all text-[13px] font-bold group"
                        >
                            <Icon icon={Trash2} size={14} className="text-red-300 group-hover:text-red-500" />
                            <span>حذف</span>
                        </button>

                        <div className="w-px h-4 bg-gray-100 mx-1" />

                        <button
                            onClick={() => setSelectedRows(new Set())}
                            className="px-3 py-1.5 hover:bg-gray-100 text-gray-400 rounded-lg transition-all text-[13px] font-bold"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
