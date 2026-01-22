'use client';

import { useState, useMemo, useEffect } from "react";
import {
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    MapPin,
    Calendar as CalendarIcon
} from "lucide-react";
import { Appointment, Country, Location } from "@/lib/storage/types";

interface VisualAppointmentPickerProps {
    appointments: Appointment[];
    countries: Country[];
    locations: Location[];
    selectedId: string;
    onSelect: (id: string, countryId: string) => void;
}

const COUNTRY_FLAGS: Record<string, string> = {
    'SPAIN': '🇪🇸',
    'FRANCE': '🇫🇷',
    'GERMANY': '🇩🇪',
    'ITALY': '🇮🇹',
};

export default function VisualAppointmentPicker({ appointments, countries, locations, selectedId, onSelect }: VisualAppointmentPickerProps) {
    // 1. Derive Countries globally
    const availableCountries = useMemo(() => {
        const countryIds = new Set(appointments.map(a => a.countryId));
        return countries.filter(c => countryIds.has(c.id));
    }, [appointments, countries]);

    const [selectedCountryId, setSelectedCountryId] = useState<string>(availableCountries[0]?.id || '');

    // 2. Derive Cities based on Selected Country
    const availableCities = useMemo(() => {
        const appointmentLocationIds = new Set(
            appointments
                .filter(a => a.countryId === selectedCountryId)
                .map(a => a.locationId)
        );
        return locations.filter(l => appointmentLocationIds.has(l.id));
    }, [appointments, selectedCountryId, locations]);

    const [selectedCity, setSelectedCity] = useState<string | null>(null);

    // Auto-select first city when country changes
    useEffect(() => {
        if (availableCities.length > 0 && !availableCities.some(l => l.id === selectedCity)) {
            setSelectedCity(availableCities[0].id);
        }
    }, [availableCities, selectedCity]);

    const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1));

    const monthName = currentMonth.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    const handleMonthNav = (dir: number) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(currentMonth.getMonth() + dir);
        setCurrentMonth(newMonth);
    };

    return (
        <div className="flex flex-col md:flex-row gap-10 items-start justify-center w-full" dir="rtl">

            {/* Legend Sidebar - Right Side in RTL */}
            <div className="w-full md:w-56 shrink-0 pt-6 order-2 md:order-2">
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-[0_8px_40px_rgba(0,0,0,0.02)] space-y-8">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 pb-5 text-right">توضيح المواعيد</h4>

                    <div className="space-y-5">
                        <div className="flex items-center gap-4">
                            <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                            <span className="text-sm font-black text-gray-700">موعد متاح</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]" />
                            <span className="text-sm font-black text-gray-700">موعد مكتمل</span>
                        </div>
                        <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
                            <div className="w-5 h-5 rounded-lg border-2 border-blue-600 bg-blue-50" />
                            <span className="text-sm font-black text-blue-900">الموعد المختار</span>
                        </div>
                    </div>

                    <p className="text-[11px] font-bold text-gray-400 leading-relaxed text-right opacity-80">
                        برجاء اختيار الموعد المتاح للسفارة والفرع المحدد لمتابعة الطلب.
                    </p>
                </div>
            </div>

            {/* Standard Pro Calendar Section */}
            <div className="flex-1 bg-white rounded-[3rem] p-10 border border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.04)] w-full transition-all order-1 md:order-1">

                {/* Responsive Header: Standard Month Nav + Flags */}
                <div className="flex flex-col space-y-8 mb-10">
                    <div className="flex items-center justify-between">
                        {/* Month Nav - Always on the Left */}
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleMonthNav(-1)} className="w-11 h-11 flex items-center justify-center hover:bg-gray-50 rounded-xl transition-all border border-gray-50 text-gray-400 hover:text-gray-900">
                                <ChevronRight size={22} />
                            </button>
                            <button onClick={() => handleMonthNav(1)} className="w-11 h-11 flex items-center justify-center hover:bg-gray-50 rounded-xl transition-all border border-gray-50 text-gray-400 hover:text-gray-900">
                                <ChevronLeft size={22} />
                            </button>
                        </div>

                        {/* Month Display - Center */}
                        <div className="flex items-center gap-3">
                            <CalendarIcon size={20} className="text-blue-600 opacity-20" />
                            <h3 className="text-2xl font-black text-gray-900 font-premium">{monthName}</h3>
                        </div>

                        {/* Flag Switcher - Right */}
                        <div className="flex gap-1.5 p-1 bg-gray-50 rounded-2xl border border-gray-100/50">
                            {availableCountries.map(country => (
                                <button
                                    key={country.id}
                                    onClick={() => setSelectedCountryId(country.id)}
                                    className={`w-12 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${selectedCountryId === country.id
                                        ? 'bg-blue-600 shadow-xl shadow-blue-600/30 scale-105'
                                        : 'opacity-20 hover:opacity-100'
                                        }`}
                                >
                                    {country.flag_emoji || '🏳️'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* City Selector Chips */}
                    {availableCities.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-6 border-t border-gray-50">
                            {availableCities.map(city => (
                                <button
                                    key={city.id}
                                    onClick={() => setSelectedCity(city.id)}
                                    className={`px-4 py-2 rounded-2xl text-[11px] font-black flex items-center gap-2 transition-all ${selectedCity === city.id
                                        ? 'bg-blue-50 text-blue-600 border-2 border-blue-200'
                                        : 'bg-white text-gray-400 border-2 border-gray-50 hover:border-gray-100'
                                        }`}
                                >
                                    <MapPin size={12} className={selectedCity === city.id ? "text-blue-500" : "text-gray-300"} />
                                    {city.name_ar}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Weekdays Header */}
                <div className="grid grid-cols-7 gap-4 mb-8">
                    {weekDays.map(d => (
                        <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{d}</div>
                    ))}
                </div>

                {/* Calendar Days - Standard Pro Sizing */}
                <div className="grid grid-cols-7 gap-4">
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-16" />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const appt = appointments.find(a =>
                            a.countryId === selectedCountryId &&
                            (!selectedCity || a.locationId === selectedCity) &&
                            a.date.startsWith(dateStr)
                        );

                        const isSelected = selectedId === appt?.id;
                        const isAvailable = appt && appt.status === 'OPEN';

                        return (
                            <button
                                key={day}
                                disabled={!isAvailable}
                                onClick={() => appt && onSelect(appt.id, selectedCountryId)}
                                className={`h-16 rounded-2xl flex flex-col items-center justify-center border-2 transition-all relative group ${!appt
                                    ? 'border-transparent text-gray-300'
                                    : !isAvailable
                                        ? 'border-transparent text-gray-200 cursor-not-allowed'
                                        : isSelected
                                            ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-lg shadow-blue-600/5'
                                            : 'border-emerald-50/50 bg-emerald-50/20 text-emerald-800 hover:border-emerald-500/30 hover:bg-emerald-50/50'
                                    }`}
                            >
                                <span className={`text-lg font-black ${isSelected ? 'text-blue-900' : isAvailable ? 'text-emerald-900' : 'text-gray-300'}`}>{day}</span>

                                {appt && (
                                    <div className="absolute top-2 right-2">
                                        <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
                                    </div>
                                )}

                                {isSelected && (
                                    <div className="absolute bottom-2 left-2 animate-in zoom-in-75 duration-300">
                                        <div className="w-6 h-6 rounded-2xl bg-white border-2 border-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/10">
                                            <CheckCircle2 size={12} className="text-blue-600" />
                                        </div>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
