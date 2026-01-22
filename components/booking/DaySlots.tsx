"use client";

import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { AppointmentSummary } from "./BookingCalendar";
import { Button } from "@/components/ui/core";
import { MapPin, CheckCircle2, Loader2, Minus, Plus, Edit2, Trash2, Check, Lock, Calendar, Plane, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { getAppointmentPricing } from "@/lib/actions";
import { ParsedPricing } from "@/lib/storage/types";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface DaySlotsProps {
    date: Date;
    appointments: AppointmentSummary[];
    selectedAppointmentId?: string;
    selectedSeatType?: 'NORMAL' | 'VIP' | null;
    initialSelection?: SavedSelection | null;
    onSelect: (app: AppointmentSummary, type: 'NORMAL' | 'VIP') => void;
    onConfirm?: (snapshot: any) => void;
}

interface SavedSelection {
    seatType: 'NORMAL' | 'VIP';
    counts: { adult: number; child: number; infant: number; total: number };
    totalPrice: number;
    pricing: ParsedPricing;
    appointment: AppointmentSummary;
    travelDate?: Date; // Optional travel date
}

export function DaySlots({ date, appointments, selectedAppointmentId, selectedSeatType, initialSelection, onSelect, onConfirm }: DaySlotsProps) {
    // 1. STATE
    const [pricing, setPricing] = useState<ParsedPricing | null>(null);
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [priceError, setPriceError] = useState<string | boolean>(false);
    const [counts, setCounts] = useState({ adult: 0, child: 0, infant: 0 });

    // State for single saved selection (only one allowed)
    const [savedSelection, setSavedSelection] = useState<SavedSelection | null>(null);

    // State for travel date (part of the main editing flow)
    const [travelDate, setTravelDate] = useState<Date | undefined>(undefined);

    // State for calendar visibility
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Track if we're editing from a saved selection (to prevent counts reset)
    const [editingSelection, setEditingSelection] = useState(false);

    // Initial load from props
    useEffect(() => {
        if (initialSelection && !savedSelection) {
            setSavedSelection(initialSelection);
        }
    }, [initialSelection]);

    // 2. EFFECT: Auto-expand first appointment when date/appointments change
    useEffect(() => {
        // Only auto-select if there's no saved selection and no current selection
        if (savedSelection || selectedAppointmentId) return;

        if (appointments.length > 0) {
            const firstAvailable = appointments[0];

            // Determine default seat type
            let defaultSeatType: 'NORMAL' | 'VIP' = 'NORMAL';
            if (firstAvailable.capacity === 0 && firstAvailable.capacity_vip && firstAvailable.capacity_vip > 0) {
                defaultSeatType = 'VIP';
            }

            // Auto-select the first appointment
            onSelect(firstAvailable, defaultSeatType);
        }
    }, [appointments, date]); // Trigger when date or appointments change

    // 3. EFFECT: Fetch Pricing
    useEffect(() => {
        if (selectedAppointmentId && selectedSeatType) {
            setLoadingPrice(true);
            setPriceError(false);
            if (!editingSelection) {
                setPricing(null);
            }

            const fetchPricing = async () => {
                try {
                    const res = await getAppointmentPricing(selectedAppointmentId);
                    if (res && res.success && res.data) {
                        setPricing(res.data);
                    } else {
                        setPriceError(res?.error || true);
                    }
                } catch (err) {
                    setPriceError('INTERNAL_ERROR');
                } finally {
                    setLoadingPrice(false);
                }
            };
            fetchPricing();

            // Only reset counts if we're NOT editing from a saved selection
            if (!editingSelection) {
                setCounts({ adult: 0, child: 0, infant: 0 });
                setTravelDate(undefined); // Reset travel date when a new appointment is selected
            } else {
                // Clear the editing flag after restoring
                setEditingSelection(false);
            }
        } else {
            setPricing(null);
            if (!editingSelection) {
                setCounts({ adult: 0, child: 0, infant: 0 });
                setTravelDate(undefined); // Reset travel date when selection is cleared
            }
        }
    }, [selectedAppointmentId, selectedSeatType]);

    // 4. COMPUTED
    const selectedApp = appointments.find(a => a.id === selectedAppointmentId);

    const maxCapacity = useMemo(() => {
        if (!selectedApp || !selectedSeatType) return 0;
        return selectedSeatType === 'NORMAL' ? selectedApp.capacity : (selectedApp.capacity_vip || 0);
    }, [selectedApp, selectedSeatType]);

    const totalPeople = counts.adult + counts.child + counts.infant;

    const totalPrice = useMemo(() => {
        if (!pricing || !selectedSeatType) return 0;
        const rates = selectedSeatType === 'NORMAL' ? pricing.normal : pricing.vip;
        return (counts.adult * rates.adult) + (counts.child * rates.child) + (counts.infant * rates.infant);
    }, [pricing, selectedSeatType, counts]);

    // 5. HANDLERS
    const updateCount = (type: 'adult' | 'child' | 'infant', delta: number) => {
        const current = counts[type];
        if (delta > 0 && totalPeople >= maxCapacity) return;
        if (delta < 0 && current === 0) return;
        setCounts(prev => ({ ...prev, [type]: prev[type] + delta }));
    };

    // Handle "Save/Done" button - Save everything at once
    const handleSaveSelection = () => {
        if (!selectedApp || !pricing || !selectedSeatType || totalPeople === 0 || !travelDate) return;

        setSavedSelection({
            seatType: selectedSeatType,
            counts: { ...counts, total: totalPeople },
            totalPrice,
            pricing,
            appointment: selectedApp,
            travelDate: travelDate
        });

        // Clear current state
        setCounts({ adult: 0, child: 0, infant: 0 });
        setTravelDate(undefined);
    };

    // Handle Edit - Re-expand the card
    const handleEdit = () => {
        if (!savedSelection) return;

        // Set the editing flag BEFORE calling onSelect
        setEditingSelection(true);

        // Restore EVERYTHING from saved state
        setCounts({
            adult: savedSelection.counts.adult,
            child: savedSelection.counts.child,
            infant: savedSelection.counts.infant
        });
        setPricing(savedSelection.pricing);

        // Restore travel date if it exists
        if (savedSelection.travelDate) {
            setTravelDate(savedSelection.travelDate);
        }

        // Set the selection back (this will trigger the useEffect, but editingSelection will prevent reset)
        onSelect(savedSelection.appointment, savedSelection.seatType);

        // Clear the saved selection to expand
        setSavedSelection(null);

        // If the selection didn't change, the useEffect won't run, so we should clear the flag
        // However, if it DOES run, we want it to see editingSelection=true.
        // The safest way is to let the effect handle it, but if it doesn't run, 
        // we'll eventually clear it on the next selection anyway.
    };

    // Handle Delete - Remove the saved selection
    const handleDelete = () => {
        setSavedSelection(null);
        // Optionally auto-select first appointment again after delete
        if (appointments.length > 0) {
            const firstAvailable = appointments[0];
            let defaultSeatType: 'NORMAL' | 'VIP' = 'NORMAL';
            if (firstAvailable.capacity === 0 && firstAvailable.capacity_vip && firstAvailable.capacity_vip > 0) {
                defaultSeatType = 'VIP';
            }
            onSelect(firstAvailable, defaultSeatType);
        }
    };

    // Handle locked appointment click
    const handleLockedClick = () => {
        alert("لا يمكنك اختيار سفارة أخرى. احذف الاختيار الحالي أو عدّله.");
    };

    const flags = Array.from(new Set(appointments.map(a => a.countryCode))).slice(0, 5);

    if (appointments.length === 0) return (
        <div className="p-8 text-center text-gray-400 text-sm">لا توجد مواعيد متاحة</div>
    );

    return (
        <div className="flex flex-col h-full w-full" key={date.toISOString()}>

            {/* HEADER */}
            <div className="bg-white border-b shadow-sm shrink-0 px-4 py-3 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            مواعيد {format(date, "d MMMM", { locale: arSA })}
                            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {appointments.length}
                            </span>
                        </h3>
                        <div className="flex items-center -space-x-1 space-x-reverse mr-2">
                            {flags.map(code => (
                                <span key={code} className={`fi fi-${code.toLowerCase()} w-4 h-3 rounded-[1px] shadow-sm border border-white`} title={code} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 pb-24">
                {appointments.map(app => {
                    const isSelected = selectedAppointmentId === app.id;
                    const isSaved = savedSelection?.appointment.id === app.id;
                    const isLocked = savedSelection && !isSaved; // Lock if there's a saved selection for a different appointment

                    // Show saved/collapsed card
                    if (isSaved && savedSelection) {
                        return (
                            <div key={app.id} className="relative py-2 z-10">
                                <div className="rounded-lg border-2 border-green-400 bg-green-50/40 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            {/* Left: Summary Info */}
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-5 rounded overflow-hidden shrink-0 shadow-sm">
                                                        {app.countryFlag ? (
                                                            <img src={app.countryFlag} className="w-full h-full object-cover" alt={app.countryName} />
                                                        ) : (
                                                            <span className={`fi fi-${app.countryCode?.toLowerCase()} text-[20px]`} />
                                                        )}
                                                    </div>
                                                    <h5 className="font-bold text-sm text-gray-900">{app.countryName}</h5>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${savedSelection.seatType === 'VIP' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {savedSelection.seatType === 'VIP' ? 'VIP' : 'عادي'}
                                                    </span>
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                </div>
                                                <div className="text-xs text-gray-600 flex items-center gap-2">
                                                    <MapPin className="w-3 h-3" />
                                                    {app.locationName}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {format(date, "EEEE d MMMM yyyy", { locale: arSA })}
                                                </div>
                                                {savedSelection.travelDate && (
                                                    <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-2 py-1.5 rounded-lg">
                                                        <Plane className="w-3.5 h-3.5" />
                                                        <span className="font-medium">
                                                            تاريخ السفر: {format(savedSelection.travelDate, "d MMMM yyyy", { locale: arSA })}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3 text-xs pt-2 border-t border-green-200">
                                                    <span className="text-gray-600">
                                                        👥 {savedSelection.counts.total} مسافرين
                                                    </span>
                                                    <span className="text-green-700 font-bold">
                                                        {savedSelection.pricing.currency} {savedSelection.totalPrice}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right: Action Buttons */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleEdit}
                                                    className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 hover:border-blue-300 text-gray-700 hover:text-blue-600 transition-all shadow-sm"
                                                    title="تعديل"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={handleDelete}
                                                    className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-red-50 hover:border-red-300 text-gray-700 hover:text-red-600 transition-all shadow-sm"
                                                    title="حذف"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // Show expanded/selected card
                    if (isSelected && selectedSeatType && !savedSelection) {
                        return (
                            <div key={app.id} className="relative py-2 z-10">
                                <div className="rounded-xl border-2 border-blue-600 shadow-xl bg-white overflow-hidden transform scale-[1.01] transition-all">
                                    {/* CARD HEADER */}
                                    <div className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-8 rounded-md flex items-center justify-center shrink-0 border border-gray-100 shadow-sm overflow-hidden">
                                                    {app.countryFlag ? (
                                                        <img src={app.countryFlag} className="w-full h-full object-cover" alt={app.countryName} />
                                                    ) : (
                                                        <span className={`fi fi-${app.countryCode?.toLowerCase()} text-[32px]`} />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-sm">{app.countryName}</h4>
                                                    <div className="flex items-center text-xs text-gray-500 gap-1 mt-1">
                                                        <MapPin className="w-3 h-3 text-gray-400" />
                                                        {app.locationName}
                                                    </div>
                                                </div>
                                            </div>
                                            {app.status === 'FULL' && (
                                                <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-full font-bold border border-red-100">
                                                    مكتمل
                                                </span>
                                            )}
                                        </div>

                                        {/* SEAT TYPES */}
                                        <div className="flex items-center gap-2 mt-4 bg-gray-50/80 p-1.5 rounded-lg border border-gray-100">
                                            <button
                                                onClick={() => onSelect(app, 'NORMAL')}
                                                disabled={app.capacity === 0 || app.status === 'FULL'}
                                                className={`flex-1 flex items-center justify-between px-3 py-2 rounded-md text-xs font-bold transition-all ${selectedSeatType === 'NORMAL' ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-100" : "text-gray-500 hover:bg-white/60"} ${(app.capacity === 0 || app.status === 'FULL') ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <CheckCircle2 className={`w-3.5 h-3.5 ${selectedSeatType === 'NORMAL' ? '' : 'opacity-0'}`} />
                                                    عادي
                                                </span>
                                                <span className="bg-gray-200/50 px-1.5 py-0.5 rounded text-[10px] tabular-nums text-gray-600">{app.capacity}</span>
                                            </button>
                                            <button
                                                onClick={() => onSelect(app, 'VIP')}
                                                disabled={(!app.capacity_vip || app.capacity_vip === 0) || app.status === 'FULL'}
                                                className={`flex-1 flex items-center justify-between px-3 py-2 rounded-md text-xs font-bold transition-all ${selectedSeatType === 'VIP' ? "bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-200" : "text-gray-500 hover:bg-white/60"} ${(!app.capacity_vip || app.capacity_vip === 0) ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <CheckCircle2 className={`w-3.5 h-3.5 ${selectedSeatType === 'VIP' ? '' : 'opacity-0'}`} />
                                                    VIP
                                                </span>
                                                <span className="bg-amber-100/50 px-1.5 py-0.5 rounded text-[10px] tabular-nums text-amber-800">{app.capacity_vip || '-'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* EXPANDED DETAILS */}
                                    {selectedSeatType && (
                                        <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
                                            <div className="border-t border-dashed border-gray-200 pt-4">
                                                {loadingPrice ? (
                                                    <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                                                ) : priceError ? (
                                                    <div className="text-center text-red-500 text-xs py-3 bg-red-50 rounded-lg">حدث خطأ في جلب الأسعار</div>
                                                ) : pricing ? (
                                                    <div className="space-y-4">
                                                        {/* COMPACT HORIZONTAL COUNTERS */}
                                                        <div className="grid grid-cols-3 gap-3">
                                                            {[
                                                                { type: 'adult', label: 'بالغ', age: '(+12)', price: selectedSeatType === 'NORMAL' ? pricing.normal.adult : pricing.vip.adult },
                                                                { type: 'child', label: 'طفل', age: '(12-6)', price: selectedSeatType === 'NORMAL' ? pricing.normal.child : pricing.vip.child },
                                                                { type: 'infant', label: 'رضيع', age: '(<6)', price: selectedSeatType === 'NORMAL' ? pricing.normal.infant : pricing.vip.infant },
                                                            ].map((cat) => (
                                                                <div key={cat.type} className="bg-gradient-to-b from-gray-50 to-white p-3 rounded-xl border border-gray-200 flex flex-col items-center space-y-2 shadow-sm hover:shadow-md transition-shadow">
                                                                    <div className="text-center">
                                                                        <div className="text-sm font-bold text-gray-800">{cat.label}</div>
                                                                        <div className="text-[10px] text-gray-500 font-medium">{cat.age}</div>
                                                                    </div>
                                                                    <div className="text-xs font-bold text-blue-600">
                                                                        {pricing.currency} {cat.price}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                                                                        <button
                                                                            onClick={() => updateCount(cat.type as any, -1)}
                                                                            disabled={counts[cat.type as keyof typeof counts] === 0}
                                                                            className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-gray-700 font-bold transition-colors"
                                                                        >
                                                                            <Minus className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <span className="w-8 text-center text-base font-bold tabular-nums text-gray-900">
                                                                            {counts[cat.type as keyof typeof counts]}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => updateCount(cat.type as any, 1)}
                                                                            disabled={totalPeople >= maxCapacity}
                                                                            className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-gray-700 font-bold transition-colors"
                                                                        >
                                                                            <Plus className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* TOTAL - Always Visible */}
                                                        <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100/50 px-4 py-3 rounded-xl border border-blue-200 shadow-sm">
                                                            <span className="font-bold text-blue-900 text-sm">الإجمالي التقديري</span>
                                                            <span className="font-bold text-2xl text-blue-700 tabular-nums">{pricing.currency} {totalPrice}</span>
                                                        </div>

                                                        {/* Capacity Warning */}
                                                        {totalPeople >= maxCapacity && (
                                                            <div className="text-xs text-center text-amber-600 bg-amber-50 py-2 px-3 rounded-lg border border-amber-200">
                                                                ⚠️ وصلت الحد الأقصى للسعة ({maxCapacity} مقاعد)
                                                            </div>
                                                        )}

                                                        {/* TRAVEL DATE SELECTION - Full Width Bar */}
                                                        <div className="space-y-2">
                                                            {/* Trigger Bar - Full Width like Total */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                                                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${travelDate
                                                                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-800'
                                                                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-blue-200 hover:bg-blue-50/30'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <Plane className={`w-4 h-4 ${travelDate ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    <div className="text-right">
                                                                        <div className="text-[10px] font-medium text-gray-500">موعد السفر المتوقع</div>
                                                                        <div className={`text-sm font-bold ${travelDate ? 'text-blue-800' : 'text-gray-400'}`}>
                                                                            {travelDate ? format(travelDate, "EEEE، d MMMM yyyy", { locale: arSA }) : "انقر لاختيار التاريخ"}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {isCalendarOpen ? (
                                                                    <ChevronUp className="w-4 h-4" />
                                                                ) : (
                                                                    <ChevronDown className="w-4 h-4" />
                                                                )}
                                                            </button>

                                                            {/* Ultra-Compact Inline Calendar */}
                                                            {isCalendarOpen && (
                                                                <div className="animate-in slide-in-from-top-2 duration-200">
                                                                    <div className="bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden w-full flex justify-center py-2">
                                                                        <DayPicker
                                                                            mode="single"
                                                                            selected={travelDate}
                                                                            onSelect={(date) => {
                                                                                setTravelDate(date);
                                                                                if (date) setIsCalendarOpen(false);
                                                                            }}
                                                                            locale={arSA}
                                                                            dir="rtl"
                                                                            disabled={{ before: new Date() }}
                                                                            className="p-3"
                                                                            classNames={{
                                                                                day_selected: "bg-blue-600 text-white hover:bg-blue-700 focus:bg-blue-700 rounded-lg",
                                                                                day_today: "bg-blue-100 text-blue-900 font-bold rounded-lg",
                                                                                day: "hover:bg-blue-50 rounded-lg transition-colors cursor-pointer",
                                                                                caption: "text-blue-900 font-bold mb-2",
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* SAVE/DONE BUTTON */}
                                                        <Button
                                                            onClick={() => {
                                                                if (totalPeople === 0) return; // Still disabled if no people
                                                                if (!travelDate) {
                                                                    setIsCalendarOpen(true);
                                                                    // Optional: Add a shake effect or flash here if needed
                                                                    return;
                                                                }
                                                                handleSaveSelection();
                                                            }}
                                                            disabled={totalPeople === 0}
                                                            className={`w-full py-4 font-bold shadow-lg transition-all text-base
                                                                ${travelDate
                                                                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-300'
                                                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-300 animate-pulse'
                                                                }
                                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                            `}
                                                        >
                                                            <span className="flex items-center justify-center gap-2">
                                                                {travelDate ? <Check className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                                                                {totalPeople === 0 ? 'حدد الأفراد أولاً' : !travelDate ? 'اضغط لتحديد تاريخ السفر' : 'تم - حفظ الاختيار'}
                                                            </span>
                                                        </Button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    // Show locked/disabled cards
                    if (isLocked) {
                        return (
                            <div
                                key={app.id}
                                onClick={handleLockedClick}
                                className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden opacity-50 cursor-not-allowed relative"
                            >
                                {/* Lock Overlay */}
                                <div className="absolute inset-0 bg-gray-100/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                    <div className="bg-white rounded-full p-2 shadow-md">
                                        <Lock className="w-5 h-5 text-gray-500" />
                                    </div>
                                </div>

                                <div className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-8 rounded-md flex items-center justify-center shrink-0 border border-gray-100 shadow-sm overflow-hidden">
                                                {app.countryFlag ? (
                                                    <img src={app.countryFlag} className="w-full h-full object-cover grayscale" alt={app.countryName} />
                                                ) : (
                                                    <span className={`fi fi-${app.countryCode?.toLowerCase()} text-[32px] grayscale`} />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-500 text-sm">{app.countryName}</h4>
                                                <div className="flex items-center text-xs text-gray-400 gap-1 mt-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {app.locationName}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // Show normal/available cards (when no selection is saved)
                    return (
                        <div
                            key={app.id}
                            onClick={() => {
                                // Default selection logic: Normal if capacity > 0, else VIP
                                let type: 'NORMAL' | 'VIP' = 'NORMAL';
                                if (app.capacity === 0 && app.capacity_vip && app.capacity_vip > 0) {
                                    type = 'VIP';
                                }
                                onSelect(app, type);
                            }}
                            className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-8 rounded-md flex items-center justify-center shrink-0 border border-gray-100 shadow-sm overflow-hidden group-hover:border-blue-200 transition-colors">
                                            {app.countryFlag ? (
                                                <img src={app.countryFlag} className="w-full h-full object-cover" alt={app.countryName} />
                                            ) : (
                                                <span className={`fi fi-${app.countryCode?.toLowerCase()} text-[32px]`} />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">{app.countryName}</h4>
                                            <div className="flex items-center text-xs text-gray-500 gap-1 mt-1">
                                                <MapPin className="w-3 h-3 text-gray-400" />
                                                {app.locationName}
                                            </div>
                                        </div>
                                    </div>
                                    {app.status === 'FULL' && (
                                        <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-full font-bold border border-red-100">
                                            مكتمل
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-4 bg-gray-50/80 p-1.5 rounded-lg border border-gray-100 group-hover:bg-blue-50/50 transition-colors">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent duplicate trigger
                                            onSelect(app, 'NORMAL');
                                        }}
                                        disabled={app.capacity === 0 || app.status === 'FULL'}
                                        className={`flex-1 flex items-center justify-between px-3 py-2 rounded-md text-xs font-bold transition-all ${app.capacity > 0 ? "text-gray-600 hover:bg-white" : "text-gray-300"}`}
                                    >
                                        <span className="flex items-center gap-1.5">عادي</span>
                                        <span className="bg-gray-200/50 px-1.5 py-0.5 rounded text-[10px] tabular-nums text-gray-600">{app.capacity}</span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent duplicate trigger
                                            onSelect(app, 'VIP');
                                        }}
                                        disabled={(!app.capacity_vip || app.capacity_vip === 0) || app.status === 'FULL'}
                                        className={`flex-1 flex items-center justify-between px-3 py-2 rounded-md text-xs font-bold transition-all ${app.capacity_vip && app.capacity_vip > 0 ? "text-gray-600 hover:bg-white" : "text-gray-300"}`}
                                    >
                                        <span className="flex items-center gap-1.5">VIP</span>
                                        <span className="bg-amber-100/50 px-1.5 py-0.5 rounded text-[10px] tabular-nums text-amber-800">{app.capacity_vip || '-'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* STICKY FOOTER: Continue to Step 2 */}
            {savedSelection && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-green-200 z-50 animate-in slide-in-from-bottom-5 duration-300">
                    <Button
                        onClick={() => onConfirm?.(savedSelection)}
                        size="lg"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                    >
                        <span>الاستمرار لإدخال بيانات المسافرين</span>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </div>
            )}
        </div>
    );
}
