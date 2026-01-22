'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Input } from '@/components/ui/core';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CustomDatePickerProps {
    value?: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    id?: string;
    name?: string;
    required?: boolean;
}

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export function CustomDatePicker({ value, onChange, id, name, required }: CustomDatePickerProps) {
    const [open, setOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(value ? new Date(value) : new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    // View state (Month/Year we are looking at)
    const [viewYear, setViewYear] = useState(currentDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(currentDate.getMonth());

    useEffect(() => {
        if (value) {
            const date = new Date(value);
            setCurrentDate(date);
            // Only update view if we are not actively browsing? No, stick to view state unless opened newly.
        }
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [containerRef]);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const handlePrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const handleSelectDay = (day: number) => {
        // Construct YYYY-MM-DD strictly
        // Note: Month is 0-indexed, so we add 1.
        const m = (viewMonth + 1).toString().padStart(2, '0');
        const d = day.toString().padStart(2, '0');
        const isoDate = `${viewYear}-${m}-${d}`;

        onChange(isoDate);
        setOpen(false);
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(viewYear, viewMonth);
        const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
        const days = [];

        // Empty cells for padding
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const isSelected = value &&
                new Date(value).getDate() === day &&
                new Date(value).getMonth() === viewMonth &&
                new Date(value).getFullYear() === viewYear;

            const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === viewMonth &&
                new Date().getFullYear() === viewYear;

            days.push(
                <button
                    key={day}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSelectDay(day); }}
                    className={`
                        h-8 w-8 rounded-full text-sm flex items-center justify-center
                        hover:bg-blue-100 transition-colors
                        ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700 font-bold' : 'text-gray-700'}
                        ${!isSelected && isToday ? 'border border-blue-600 text-blue-600' : ''}
                    `}
                >
                    {day}
                </button>
            );
        }

        return days;
    };

    // Format display value like "20 Dec 2024" or pure ISO
    const displayValue = value ? value : "";

    return (
        <div className="relative font-sans text-left" dir="ltr" ref={containerRef}>
            <div
                className="flex items-center w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                onClick={() => setOpen(!open)}
            >
                <CalendarIcon className="mr-2 h-4 w-4 opacity-50 text-gray-400" />
                <span className={!value ? "text-muted-foreground text-gray-400" : "text-gray-900 font-mono"}>
                    {displayValue || "Select Date..."}
                </span>
                {/* Hidden input for form submission if needed, though we usually control state */}
                {name && <input type="hidden" name={name} value={value || ''} />}
            </div>

            {open && (
                <div className="absolute top-full mt-2 left-0 z-50 w-[280px] rounded-md border bg-white p-3 shadow-md animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-full">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="font-semibold text-sm">
                            {MONTH_NAMES[viewMonth]} {viewYear}
                        </div>
                        <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-full">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
                        <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 place-items-center">
                        {renderCalendar()}
                    </div>

                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            className="text-xs text-blue-600 hover:underline"
                            onClick={() => {
                                const today = new Date();
                                setViewMonth(today.getMonth());
                                setViewYear(today.getFullYear());
                                // Optional: Select today?
                                // handleSelectDay(today.getDate());
                            }}
                        >
                            Jump to Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
