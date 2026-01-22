"use client";

import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, getDay } from "date-fns";
import { arSA } from "date-fns/locale";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/components/ui/core";

export interface AppointmentSummary {
    id: string;
    date: string;
    countryCode: string;
    countryName: string;
    countryFlag: string | null;
    locationName: string;
    status: 'OPEN' | 'FULL' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';
    capacity: number;
    capacity_vip?: number;
}

interface BookingCalendarProps {
    currentMonth: Date;
    onMonthChange: (date: Date) => void;
    appointments: AppointmentSummary[];
    selectedDate: Date | undefined;
    onDateSelect: (date: Date) => void;
    slotView?: React.ReactNode;
}

// Helper to convert code to Emoji
const getFlagEmoji = (countryCode: string) => {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

export function BookingCalendar({
    currentMonth,
    onMonthChange,
    appointments,
    selectedDate,
    onDateSelect,
    slotView
}: BookingCalendarProps) {

    const days = useMemo(() => eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    }), [currentMonth]);

    const startDay = getDay(startOfMonth(currentMonth));
    const padding = Array.from({ length: startDay });

    const getDayApps = (day: Date) => appointments.filter(app => isSameDay(new Date(app.date), day));

    // Priority: OPEN > FULL > COMPLETED > CANCELLED
    const getDayStatus = (apps: AppointmentSummary[]) => {
        if (!apps.length) return null;
        if (apps.some(a => a.status === 'OPEN')) return 'OPEN';
        if (apps.some(a => a.status === 'FULL')) return 'FULL';
        if (apps.some(a => a.status === 'COMPLETED')) return 'COMPLETED';
        return 'CANCELLED';
    };

    const statusColors = {
        OPEN: "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
        FULL: "bg-red-50 border-red-200",
        COMPLETED: "bg-blue-50 border-blue-200",
        CANCELLED: "bg-gray-100 border-gray-200 text-gray-400",
    };

    const dotColors = {
        OPEN: "bg-emerald-500",
        FULL: "bg-red-500",
        COMPLETED: "bg-blue-500",
        CANCELLED: "bg-gray-500",
    };

    // Grouping Helper - Unique Countries Only
    const groupAppsByCountry = (apps: AppointmentSummary[]) => {
        const groups: Record<string, { code: string, name: string, count: number }> = {};

        apps.forEach(app => {
            if (!groups[app.countryCode]) {
                groups[app.countryCode] = {
                    code: app.countryCode,
                    name: app.countryName,
                    count: 0,
                };
            }
            groups[app.countryCode].count++;
        });

        return Object.values(groups);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-visible flex flex-col h-full relative">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-gray-50/50 shrink-0">
                <button onClick={() => onMonthChange(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
                <h2 className="text-base font-bold text-gray-800">
                    {format(currentMonth, "MMMM yyyy", { locale: arSA })}
                </h2>
                <button onClick={() => onMonthChange(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b bg-gray-50 text-[10px] font-semibold text-gray-500 shrink-0">
                {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(d => (
                    <div key={d} className="py-2 text-center">{d}</div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 auto-rows-fr">
                {padding.map((_, i) => <div key={`pad-${i}`} className="min-h-[60px] bg-gray-50/20 border-b border-l last:border-l-0" />)}

                {days.map((day) => {
                    const dayApps = getDayApps(day);
                    const primaryStatus = getDayStatus(dayApps);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);

                    const groupedApps = groupAppsByCountry(dayApps);
                    const visibleGroups = groupedApps.slice(0, 2);
                    const hiddenCount = groupedApps.length - 2;

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => dayApps.length && onDateSelect(day)}
                            className={cn(
                                "min-h-[60px] p-1.5 border-b border-l last:border-l-0 relative transition-all group flex flex-col items-start gap-1",
                                dayApps.length ? "cursor-pointer hover:shadow-md z-0 hover:z-10" : "bg-gray-50/10 cursor-default",
                                primaryStatus ? statusColors[primaryStatus] : "",
                                isSelected && "ring-2 ring-inset ring-blue-600 z-10",
                            )}
                        >
                            {/* Date Number & Status Dots */}
                            <div className="flex justify-between items-start w-full mb-1">
                                <span className={cn(
                                    "text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full",
                                    isTodayDate ? "bg-blue-600 text-white" : "text-gray-700",
                                    isSelected && !isTodayDate && "text-blue-700 font-bold"
                                )}>
                                    {format(day, "d")}
                                </span>
                                {/* Dots only if mixed status or simplify ui? User said "Signals only". 
                                   User: "If day has >1 status, prioritize or show dots". I'll keep dots as they are subtle signals. 
                                */}
                                {dayApps.length > 0 && (
                                    <div className="flex gap-0.5">
                                        {[...new Set(dayApps.map(a => a.status))].slice(0, 3).map(s => (
                                            <span key={s} className={cn("w-1.5 h-1.5 rounded-full", dotColors[s as keyof typeof dotColors] || "bg-gray-300")} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Minimalist Flags Container - Using flag-icons for Windows compatibility */}
                            <div className="w-full flex flex-wrap gap-1 content-start mt-auto">
                                {visibleGroups.map((group) => (
                                    <div key={group.code} className="relative group/tooltip cursor-help">
                                        {/* CSS Flag Icon */}
                                        <span className={`fi fi-${group.code.toLowerCase()} text-sm leading-none shadow-sm filter grayscale-[0.2] group-hover/tooltip:grayscale-0 transition-all block rounded-[1px]`} />

                                        {/* CSS Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-gray-800 text-white text-[10px] rounded px-2 py-1 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 shadow-lg pointer-events-none whitespace-nowrap font-sans">
                                            {group.name} ({group.count})
                                            {/* Arrow */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                                        </div>
                                    </div>
                                ))}

                                {/* Plus Indicator */}
                                {hiddenCount > 0 && (
                                    <div className="relative group/tooltip cursor-help flex items-center">
                                        <span className="text-[10px] font-bold text-gray-500 bg-white/50 px-1 rounded-sm border border-gray-200">
                                            +{hiddenCount}
                                        </span>

                                        {/* Overflow Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-gray-800 text-white text-[10px] rounded p-2 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 shadow-lg pointer-events-none text-right font-sans">
                                            {groupedApps.slice(2).map(g => (
                                                <div key={g.code} className="flex items-center gap-2 mb-1 last:mb-0">
                                                    <span className={`fi fi-${g.code.toLowerCase()} w-3 h-2 rounded-[1px]`} />
                                                    <span>{g.name} ({g.count})</span>
                                                </div>
                                            ))}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* In-Card Day Slots (if selected) */}
            {slotView && (
                <div className="border-t bg-gray-50 h-[60vh] min-h-[400px] flex flex-col relative animate-in slide-in-from-bottom-2 z-20 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)]">
                    {slotView}
                </div>
            )}

            {/* Legend */}
            <div className="p-2 border-t bg-white flex items-center gap-3 text-[10px] text-gray-600 justify-center shrink-0">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> متاح</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> مكتمل</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> منتهي</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500"></span> ملغي</div>
            </div>
        </div>
    );
}
