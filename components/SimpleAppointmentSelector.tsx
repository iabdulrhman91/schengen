"use client";

import { useState } from "react";
import { Appointment, Country, Location } from "@/lib/storage/types";
import { cn } from "@/components/ui/core";
import { CheckCircle2, Calendar, MapPin } from "lucide-react";

interface SimpleAppointmentSelectorProps {
    appointments: Appointment[];
    countries: Country[];
    locations: Location[];
    selectedAppointmentId?: string;
    onSelect: (appt: Appointment) => void;
}

export function SimpleAppointmentSelector({
    appointments,
    countries,
    locations,
    selectedAppointmentId,
    onSelect
}: SimpleAppointmentSelectorProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

    // Derived Data
    // 1. Available Countries (from appointments)
    const availableCountryIds = Array.from(new Set(appointments.map(a => a.countryId)));

    // 2. Available Locations (for selected country)
    const availableLocationIds = Array.from(new Set(
        appointments
            .filter(a => a.countryId === selectedCountryId)
            .map(a => a.locationId)
    ));

    // 3. Available Dates (for selected country + location)
    const availableAppointments = appointments.filter(a =>
        a.countryId === selectedCountryId &&
        a.locationId === selectedLocationId &&
        a.status === 'OPEN'
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (step === 1) {
        return (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="font-semibold text-gray-700 mb-4">1. اختر السفارة</h3>
                <div className="grid grid-cols-2 gap-4">
                    {availableCountryIds.map(cId => {
                        const country = countries.find(c => c.id === cId);
                        return (
                            <button
                                key={cId}
                                onClick={() => {
                                    setSelectedCountryId(cId);
                                    setStep(2);
                                }}
                                className={cn(
                                    "p-6 rounded-2xl border-2 transition-all text-center hover:bg-blue-50 hover:border-blue-200",
                                    selectedCountryId === cId ? "border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-md" : "border-gray-100 bg-white"
                                )}
                            >
                                <span className="block text-4xl mb-2">
                                    {country?.code === 'SPAIN' ? '🇪🇸' : country?.code === 'FRANCE' ? '🇫🇷' : '🏳️'}
                                </span>
                                <span className="text-lg">{country?.name_ar || 'غير معروف'}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-700">2. اختر المدينة</h3>
                    <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-600 underline">تغيير السفارة</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {availableLocationIds.map(lId => {
                        const loc = locations.find(l => l.id === lId);
                        return (
                            <button
                                key={lId}
                                onClick={() => {
                                    setSelectedLocationId(lId);
                                    setStep(3);
                                }}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 hover:border-blue-400 hover:text-blue-600",
                                    selectedLocationId === lId ? "border-blue-600 bg-blue-50 text-blue-700 font-bold" : "border-gray-100 bg-white text-gray-600"
                                )}
                            >
                                <MapPin className="w-4 h-4" />
                                {loc?.name_ar || 'غير محدد'}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (step === 3) {
        return (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-700">3. اختر الموعد المتاح</h3>
                    <button onClick={() => setStep(2)} className="text-sm text-gray-400 hover:text-gray-600 underline">تغيير المدينة</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableAppointments.map(appt => (
                        <button
                            key={appt.id}
                            onClick={() => onSelect(appt)}
                            className={cn(
                                "flex flex-col items-start p-4 rounded-xl border-2 transition-all hover:border-emerald-500 hover:bg-emerald-50/30 text-right relative overflow-hidden group",
                                selectedAppointmentId === appt.id ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500" : "border-gray-100 bg-white"
                            )}
                        >
                            <div className="flex items-center gap-3 mb-3 w-full">
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", selectedAppointmentId === appt.id ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400")}>
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900">
                                        {new Date(appt.date).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </div>
                                    <div className="text-xs text-gray-400 font-mono mt-0.5">{appt.code}</div>
                                </div>
                            </div>

                            <div className="w-full pt-3 border-t border-gray-50 flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">
                                    {appt.capacity} شاغر
                                </span>
                                {selectedAppointmentId === appt.id && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                            </div>
                        </button>
                    ))}
                    {availableAppointments.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                            لا توجد مواعيد متاحة في هذا الموقع حالياً
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
}
