"use client"

import * as React from "react"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, setMonth, setYear, getYear, getMonth } from "date-fns"
import { arSA } from "date-fns/locale"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from "lucide-react"
import { cn } from "@/components/ui/core"
import { Button } from "@/components/ui/core"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface CustomDatePickerProps {
    value: Date | undefined;
    onChange: (date: Date | undefined) => void;
    placeholder?: string;
    className?: string;
    name?: string;
    id?: string;
    required?: boolean;
}

export function CustomDatePicker({ value, onChange, placeholder = "اختر التاريخ", className, name, id, required }: CustomDatePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [viewDate, setViewDate] = React.useState(value || new Date());
    const [viewMode, setViewMode] = React.useState<'days' | 'months' | 'years'>('days');

    const days = React.useMemo(() => {
        const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 6 });
        const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 6 });
        return eachDayOfInterval({ start, end });
    }, [viewDate]);

    const weekDays = ["سبت", "أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];
    const monthsAr = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear + 10 - i);

    const handleMonthSelect = (mIdx: number) => {
        setViewDate(setMonth(viewDate, mIdx));
        setViewMode('days');
    };

    const handleYearSelect = (year: number) => {
        setViewDate(setYear(viewDate, year));
        setViewMode('days');
    };

    return (
        <Popover open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setViewMode('days'); // Reset view on close
        }}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-right font-medium border-gray-200 h-11 bg-white hover:bg-gray-50 transition-all shadow-sm rounded-xl px-4",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="ml-3 h-5 w-5 text-blue-600 opacity-70" />
                    {value ? format(value, "dd MMMM yyyy", { locale: arSA }) : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-4 rounded-2xl shadow-2xl border border-gray-100 bg-white" align="start">
                <div dir="rtl" className="space-y-4">

                    {/* Integrated Header Selectors */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                            className={cn(
                                "flex-1 h-10 flex items-center justify-between px-3 rounded-xl border border-gray-100 transition-all font-bold text-xs",
                                viewMode === 'months' ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                            )}
                        >
                            <span>{monthsAr[getMonth(viewDate)]}</span>
                            <ChevronDown className={cn("h-3 w-3 transition-transform", viewMode === 'months' && "rotate-180")} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
                            className={cn(
                                "flex-1 h-10 flex items-center justify-between px-3 rounded-xl border border-gray-100 transition-all font-bold text-xs",
                                viewMode === 'years' ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                            )}
                        >
                            <span>{getYear(viewDate)}</span>
                            <ChevronDown className={cn("h-3 w-3 transition-transform", viewMode === 'years' && "rotate-180")} />
                        </button>
                    </div>

                    {viewMode === 'days' && (
                        <div className="animate-in fade-in zoom-in-95 duration-200">
                            {/* Navigation Arrows */}
                            <div className="flex items-center justify-between px-1 mb-4">
                                <div className="flex gap-1">
                                    <button type="button" onClick={() => setViewDate(subMonths(viewDate, 12))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 group"><ChevronsRight className="h-4 w-4 group-hover:text-blue-600" /></button>
                                    <button type="button" onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 group"><ChevronRight className="h-4 w-4 group-hover:text-blue-600" /></button>
                                </div>
                                <div className="font-black text-gray-900 text-xs uppercase tracking-tight">
                                    {format(viewDate, "MMMM yyyy", { locale: arSA })}
                                </div>
                                <div className="flex gap-1">
                                    <button type="button" onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 group"><ChevronLeft className="h-4 w-4 group-hover:text-blue-600" /></button>
                                    <button type="button" onClick={() => setViewDate(addMonths(viewDate, 12))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 group"><ChevronsLeft className="h-4 w-4 group-hover:text-blue-600" /></button>
                                </div>
                            </div>

                            {/* Week Days Grid */}
                            <div className="grid grid-cols-7 gap-1 mb-1">
                                {weekDays.map((day) => (
                                    <div key={day} className="text-center text-[10px] font-black text-gray-300 uppercase py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Days Grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {days.map((day, idx) => {
                                    const isSelected = value && isSameDay(day, value);
                                    const isCurrentMonth = isSameMonth(day, viewDate);
                                    const isToday = isSameDay(day, new Date());

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                onChange(day);
                                                setIsOpen(false);
                                            }}
                                            className={cn(
                                                "h-9 w-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all",
                                                isSelected
                                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                                                    : "hover:bg-blue-50 text-gray-600",
                                                !isCurrentMonth && "text-gray-200 font-normal",
                                                isToday && !isSelected && "text-blue-600 bg-blue-50 ring-1 ring-blue-100 shadow-sm"
                                            )}
                                        >
                                            {format(day, "d")}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {viewMode === 'months' && (
                        <div className="grid grid-cols-3 gap-2 py-2 animate-in slide-in-from-top-2 duration-300">
                            {monthsAr.map((m, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleMonthSelect(i)}
                                    className={cn(
                                        "py-4 rounded-xl text-sm font-bold transition-all",
                                        getMonth(viewDate) === i ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "hover:bg-gray-50 text-gray-700"
                                    )}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    )}

                    {viewMode === 'years' && (
                        <div className="h-64 px-1 py-2 overflow-y-auto animate-in slide-in-from-top-2 duration-300 custom-scrollbar">
                            <style jsx>{`
                                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                           `}</style>
                            <div className="grid grid-cols-3 gap-2">
                                {years.map((y) => (
                                    <button
                                        key={y}
                                        type="button"
                                        onClick={() => handleYearSelect(y)}
                                        className={cn(
                                            "py-3 rounded-xl text-sm font-bold transition-all",
                                            getYear(viewDate) === y ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "hover:bg-gray-50 text-gray-700"
                                        )}
                                    >
                                        {y}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <input type="hidden" name={name} id={id} value={value ? format(value, "yyyy-MM-dd") : ""} required={required} />
            </PopoverContent>
        </Popover>
    )
}
