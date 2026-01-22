"use client";

import { useState, useEffect } from "react";
import { getCalendarAppointments, submitWizardFinalAction } from "@/lib/actions";
import { BookingCalendar, AppointmentSummary } from "@/components/booking/BookingCalendar";
import { DaySlots } from "@/components/booking/DaySlots";
import { PassengerForm, PassengerData } from "@/components/booking/PassengerForm";
import { startOfMonth, isSameDay, format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Button } from "@/components/ui/core";
import {
    ArrowRight, ArrowLeft, Loader2, Users, CheckCircle2,
    ChevronDown, ChevronUp, User, Check, AlertCircle, Upload
} from "lucide-react";
import { useRouter } from "next/navigation";

// PassengerData is now imported

interface SavedAppointmentData {
    appointment: AppointmentSummary;
    seatType: 'NORMAL' | 'VIP';
    counts: { adult: number; child: number; infant: number; total: number };
    totalPrice: number;
    travelDate: Date;
}

export default function CaseCreationWizard() {
    const router = useRouter();

    // Step management
    const [currentStep, setCurrentStep] = useState<'appointment' | 'passengers' | 'sponsorship' | 'review'>('appointment');

    // State
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
    const [loading, setLoading] = useState(false);

    // Selection
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentSummary | undefined>(undefined);
    const [selectedSeatType, setSelectedSeatType] = useState<'NORMAL' | 'VIP' | null>(null);
    const [savedAppointmentData, setSavedAppointmentData] = useState<SavedAppointmentData | null>(null);

    // Passenger data
    const [passengers, setPassengers] = useState<PassengerData[]>([]);
    const [phone, setPhone] = useState('');
    const [activePassengerIndex, setActivePassengerIndex] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // Sponsorship data
    const [relationshipType, setRelationshipType] = useState<'FAMILY' | 'FRIENDS' | null>(null);
    const [sponsorshipMap, setSponsorshipMap] = useState<Record<string, {
        type: 'SELF' | 'PASSENGER' | 'EXTERNAL';
        targetId?: string;
        externalInfo?: { relation: string, fullName: string, idFile?: string, workPlace?: string, jobTitle?: string },
        workPlace?: string,
        jobTitle?: string
    }>>({});

    useEffect(() => {
        const fetchApps = async () => {
            setLoading(true);
            try {
                const data = await getCalendarAppointments(currentMonth.getFullYear(), currentMonth.getMonth());
                setAppointments(data as any);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchApps();
    }, [currentMonth]);

    useEffect(() => {
        if (savedAppointmentData && currentStep === 'passengers') {
            const { counts } = savedAppointmentData;

            // Check if existing passengers already match the counts
            const currentAdults = passengers.filter(p => p.type === 'ADULT').length;
            const currentChildren = passengers.filter(p => p.type === 'CHILD').length;
            const currentInfants = passengers.filter(p => p.type === 'INFANT').length;

            if (currentAdults === counts.adult &&
                currentChildren === counts.child &&
                currentInfants === counts.infant) {
                return;
            }

            const passengerList: PassengerData[] = [];

            const createOrKeepP = (type: any, count: number, prefix: string) => {
                const existingOfType = passengers.filter(p => p.type === type);
                for (let i = 0; i < count; i++) {
                    if (existingOfType[i]) {
                        passengerList.push(existingOfType[i]);
                    } else {
                        passengerList.push({
                            id: `${prefix}-${i}-${Date.now()}`,
                            type,
                            fullName: '',
                            passportNumber: '',
                            idNumber: '',
                            nationality: '',
                            sex: '',
                            birthDate: '',
                            issueDate: '',
                            expiryDate: '',
                            placeOfBirth: '',
                            appointmentDate: savedAppointmentData.travelDate.toISOString()
                        });
                    }
                }
            };

            createOrKeepP('ADULT', counts.adult, 'adult');
            createOrKeepP('CHILD', counts.child, 'child');
            createOrKeepP('INFANT', counts.infant, 'infant');
            setPassengers(passengerList);
        }
    }, [savedAppointmentData, currentStep]);

    const handleAppointmentConfirm = (snapshot: any) => {
        setSavedAppointmentData(snapshot);
        setCurrentStep('passengers');
    };

    const handleBackToAppointment = () => {
        setCurrentStep('appointment');
    };

    const handlePassengerChange = (index: number, data: PassengerData) => {
        setPassengers(prev => {
            const updated = [...prev];
            updated[index] = data;
            return updated;
        });
    };

    const isPassengerComplete = (p: PassengerData) => {
        // Relaxed validation for testing - all passengers are considered "complete" to allow flow testing
        return true;
    };

    const getPassengerLabel = (p: PassengerData, index: number) => {
        const type = p.type === 'ADULT' ? 'بالغ' : p.type === 'CHILD' ? 'طفل' : 'رضيع';
        return `${type} ${index + 1}`;
    };

    const handleFinalSubmit = () => {
        const currentP = passengers[activePassengerIndex];
        if (!isPassengerComplete(currentP)) {
            alert('يرجى إكمال جميع بيانات المسافر الحالي قبل المتابعة');
            return;
        }

        const allValid = passengers.every(p => isPassengerComplete(p));
        if (!allValid) {
            alert('يرجى إكمال جميع بيانات المسافرين');
            return;
        }

        setCurrentStep('sponsorship');
    };

    const adultsCount = passengers.filter(p => p.type === 'ADULT').length;
    const minorsCount = passengers.filter(p => p.type !== 'ADULT').length;
    const isMixedFamily = adultsCount > 0 && minorsCount > 0;
    const isMinorsOnly = adultsCount === 0 && minorsCount > 0;
    const isMultipleAdultsOnly = adultsCount > 1 && minorsCount === 0;
    const isSingleAdult = adultsCount === 1 && minorsCount === 0;

    // Use effect to handle auto-selection logic
    useEffect(() => {
        if (currentStep === 'sponsorship') {
            if (isMixedFamily) {
                setRelationshipType('FAMILY');
            } else if (isMinorsOnly) {
                const init: any = {};
                passengers.forEach(p => init[p.id] = { type: 'EXTERNAL', externalInfo: { relation: '', fullName: '', workPlace: '', jobTitle: '' } });
                setSponsorshipMap(init);
            } else if (isSingleAdult) {
                const pId = passengers[0].id;
                if (!sponsorshipMap[pId]) {
                    setSponsorshipMap({ [pId]: { type: 'SELF', workPlace: '', jobTitle: '' } });
                }
            }
        }
    }, [currentStep, isMixedFamily, isMinorsOnly, isSingleAdult, passengers]);

    const handleSponsorshipSubmit = () => {
        // Relaxed validation for testing/development speed as per user request
        setCurrentStep('review');
    };

    const submitWizard = async (finalData: any) => {
        setSubmitting(true);
        try {
            await submitWizardFinalAction({
                appointmentId: finalData.appointment.appointment.id,
                seatType: finalData.appointment.seatType,
                passengers: finalData.passengers,
                relationshipType: finalData.relationshipType,
                sponsorship: finalData.sponsorship,
                phone: finalData.phone
            });
            alert('تم إنشاء الطلب بنجاح!');
            router.push('/requests');
        } catch (error: any) {
            console.error(error);
            alert('عذراً، فشل في إنشاء الطلب: ' + (error.message || 'خطأ غير معروف'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmFinal = () => {
        submitWizard({ appointment: savedAppointmentData, passengers, relationshipType, sponsorship: sponsorshipMap, phone });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in duration-500">
            {/* Step Indicator */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sticky top-4 z-40 backdrop-blur-md bg-white/90">
                <div className="flex items-center justify-center gap-2 sm:gap-4">
                    <div className={`flex items-center gap-2 ${currentStep === 'appointment' ? 'text-blue-600' : 'text-green-600'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep === 'appointment' ? 'bg-blue-100' : 'bg-green-100'}`}>
                            {currentStep !== 'appointment' ? <CheckCircle2 className="w-5 h-5" /> : '1'}
                        </div>
                        <span className="font-bold text-xs sm:text-sm">الموعد</span>
                    </div>
                    <div className="h-0.5 w-8 sm:w-16 bg-gray-200"></div>
                    <div className={`flex items-center gap-2 ${['passengers', 'sponsorship', 'review'].includes(currentStep) ? (['sponsorship', 'review'].includes(currentStep) ? 'text-green-600' : 'text-blue-600') : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep === 'passengers' ? 'bg-blue-100' : ['sponsorship', 'review'].includes(currentStep) ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}>
                            {['sponsorship', 'review'].includes(currentStep) ? <CheckCircle2 className="w-5 h-5" /> : '2'}
                        </div>
                        <span className="font-bold text-xs sm:text-sm">المسافرين</span>
                    </div>
                    <div className="h-0.5 w-6 sm:w-12 bg-gray-200"></div>
                    <div className={`flex items-center gap-2 ${['sponsorship', 'review'].includes(currentStep) ? (currentStep === 'review' ? 'text-green-600' : 'text-blue-600') : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep === 'sponsorship' ? 'bg-blue-100' : currentStep === 'review' ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}>
                            {currentStep === 'review' ? <CheckCircle2 className="w-5 h-5" /> : '3'}
                        </div>
                        <span className="font-bold text-xs sm:text-sm">المتكفل</span>
                    </div>
                    <div className="h-0.5 w-6 sm:w-12 bg-gray-200"></div>
                    <div className={`flex items-center gap-2 ${currentStep === 'review' ? 'text-blue-600' : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep === 'review' ? 'bg-blue-100' : 'bg-gray-100'}`}>4</div>
                        <span className="font-bold text-xs sm:text-sm">المراجعة</span>
                    </div>
                </div>
            </div>

            {/* Content per step */}
            {currentStep === 'appointment' && (
                <div className="relative">
                    {loading && <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center rounded-xl backdrop-blur-sm"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}
                    <BookingCalendar currentMonth={currentMonth} onMonthChange={setCurrentMonth} appointments={appointments} selectedDate={selectedDate} onDateSelect={(d) => { setSelectedDate(d); setSelectedAppointment(undefined); setSelectedSeatType(null); }}
                        slotView={selectedDate ? <DaySlots date={selectedDate} appointments={appointments.filter(a => isSameDay(new Date(a.date), selectedDate))} selectedAppointmentId={selectedAppointment?.id} selectedSeatType={selectedSeatType} initialSelection={savedAppointmentData as any} onSelect={(app, type) => { setSelectedAppointment(app); setSelectedSeatType(type); }} onConfirm={handleAppointmentConfirm} /> : null} />
                </div>
            )}

            {currentStep === 'passengers' && savedAppointmentData && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                    {/* Summary */}
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 p-4 shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" />الموعد المحدد</h3>
                            <p className="text-xs text-gray-500 mt-1">{savedAppointmentData.appointment.countryName} - {format(new Date(savedAppointmentData.appointment.date), "EEEE، d MMMM", { locale: arSA })}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleBackToAppointment} className="flex items-center gap-2"><ArrowRight className="w-4 h-4" />تغيير</Button>
                    </div>

                    {/* Contact Phone */}
                    <div className="bg-white rounded-xl border border-blue-100 p-6 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 text-blue-600">
                            <div className="bg-blue-50 p-2 rounded-lg">
                                <Users className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold uppercase tracking-wide text-sm text-gray-800">بيانات التواصل للطلب</h3>
                        </div>
                        <div className="relative">
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">🇸🇦 +966</span>
                            <input
                                type="tel"
                                placeholder="5XXXXXXXX"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                                className="w-full pr-24 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-mono text-lg tracking-widest"
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 mr-2">هذا الرقم سيتم استخدامه للتواصل بخصوص جميع المسافرين في هذا الموعد</p>
                    </div>

                    {/* Stepper */}
                    <div className="space-y-4">
                        {passengers.map((passenger, index) => {
                            const isActive = index === activePassengerIndex;
                            const isDone = isPassengerComplete(passenger);
                            return (
                                <div key={passenger.id} className="relative flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div onClick={() => setActivePassengerIndex(index)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${isActive ? 'bg-blue-600 border-blue-600 text-white' : isDone ? 'bg-green-500 border-green-500 text-white' : 'bg-white text-gray-300'}`}>
                                            {isDone && !isActive ? <Check className="w-4 h-4" /> : index + 1}
                                        </div>
                                        {index < passengers.length - 1 && <div className="w-0.5 flex-1 bg-gray-100 my-1"></div>}
                                    </div>
                                    <div className={`flex-1 rounded-xl border transition-all ${isActive ? 'bg-white border-blue-200 shadow-md p-6' : 'bg-gray-50 border-gray-100 p-4 cursor-pointer'}`} onClick={() => !isActive && setActivePassengerIndex(index)}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-gray-700">{getPassengerLabel(passenger, index)} {passenger.fullName && <span className="mr-2 text-gray-400 font-normal">| {passenger.fullName}</span>}</span>
                                            {isActive ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                        </div>
                                        {isActive && (
                                            <div className="animate-in fade-in duration-300">
                                                <PassengerForm passengerType={passenger.type} index={index} data={passenger} onChange={(d) => handlePassengerChange(index, d)} />
                                                <div className="flex justify-between mt-6 pt-4 border-t">
                                                    {index > 0 ? (
                                                        <Button variant="ghost" onClick={() => setActivePassengerIndex(index - 1)}>السابق</Button>
                                                    ) : (
                                                        <div />
                                                    )}
                                                    <Button onClick={() => {
                                                        if (isPassengerComplete(passenger)) {
                                                            if (index === passengers.length - 1) {
                                                                handleFinalSubmit();
                                                            } else {
                                                                setActivePassengerIndex(index + 1);
                                                            }
                                                        } else {
                                                            alert('يرجى إكمال جميع بيانات المسافر الحالي');
                                                        }
                                                    }}>
                                                        {index === passengers.length - 1 ? 'متابعة' : 'المسافر التالي'}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {currentStep === 'sponsorship' && (
                <div className="space-y-6 animate-in slide-in-from-left-4 duration-500 pb-24">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8 space-y-8">

                        {/* Choice Buttons - Only show for Multiple Adults with NO minors */}
                        {isMultipleAdultsOnly && (
                            <div className="text-center space-y-4">
                                <h2 className="text-2xl font-bold text-gray-800">تحديد نوع العلاقة</h2>
                                <p className="text-gray-500">هل المسافرون عائلة واحدة أم أصدقاء؟</p>
                                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                                    <button onClick={() => { setRelationshipType('FAMILY'); setSponsorshipMap({}); }} className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${relationshipType === 'FAMILY' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-blue-200'}`}>
                                        <div className="text-4xl">👨‍👩‍👧‍👦</div>
                                        <span className="font-bold">عائلة</span>
                                    </button>
                                    <button onClick={() => { setRelationshipType('FRIENDS'); const init: any = {}; passengers.forEach(p => init[p.id] = { type: 'SELF' }); setSponsorshipMap(init); }} className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${relationshipType === 'FRIENDS' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-blue-200'}`}>
                                        <div className="text-4xl">🤝</div>
                                        <span className="font-bold">أصدقاء</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* CASE 1: Single Adult - Self or External Sponsor */}
                        {isSingleAdult && (
                            <div className="max-w-md mx-auto space-y-4">
                                <div className="text-center">
                                    <h2 className="text-2xl font-bold text-gray-800">بيانات كفالة المسافر</h2>
                                    <p className="text-gray-500 mt-2">من يتكفل بمصاريف الرحلة؟</p>
                                </div>

                                <div className="flex justify-center gap-4 mb-4">
                                    <button
                                        onClick={() => {
                                            setSponsorshipMap({ [passengers[0].id]: { type: 'SELF', workPlace: '', jobTitle: '' } });
                                        }}
                                        className={`px-4 py-2 rounded-lg border transition-all font-bold text-sm ${(!sponsorshipMap[passengers[0].id]?.type || sponsorshipMap[passengers[0].id]?.type === 'SELF') ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
                                    >
                                        يتكفل بنفسه
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSponsorshipMap({
                                                [passengers[0].id]: {
                                                    type: 'EXTERNAL',
                                                    externalInfo: { fullName: '', relation: '', workPlace: '', jobTitle: '' }
                                                }
                                            });
                                        }}
                                        className={`px-4 py-2 rounded-lg border transition-all font-bold text-sm ${sponsorshipMap[passengers[0].id]?.type === 'EXTERNAL' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}
                                    >
                                        كفيل خارجي
                                    </button>
                                </div>

                                {(!sponsorshipMap[passengers[0].id]?.type || sponsorshipMap[passengers[0].id]?.type === 'SELF') ? (
                                    <div className="grid grid-cols-1 gap-4 p-6 bg-blue-50 rounded-xl border border-blue-100 mt-4 animate-in fade-in">
                                        <div className="text-center mb-2 text-xs font-bold text-blue-800">بيانات عمل المسافر</div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500">جهة العمل</label>
                                                <input type="text" placeholder="مثلاً: شركة أرامكو" className="w-full p-3 border rounded-lg bg-white" value={sponsorshipMap[passengers[0].id]?.workPlace || ''} onChange={(e) => { let v = e.target.value; setSponsorshipMap({ [passengers[0].id]: { ...sponsorshipMap[passengers[0].id], type: 'SELF', workPlace: v } }); }} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500">المسمى الوظيفي</label>
                                                <input type="text" placeholder="مثلاً: مهندس" className="w-full p-3 border rounded-lg bg-white" value={sponsorshipMap[passengers[0].id]?.jobTitle || ''} onChange={(e) => { let v = e.target.value; setSponsorshipMap({ [passengers[0].id]: { ...sponsorshipMap[passengers[0].id], type: 'SELF', jobTitle: v } }); }} />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-amber-50 rounded-xl border border-amber-200 space-y-4 animate-in fade-in">
                                        <div className="text-center mb-2 text-xs font-bold text-amber-800">بيانات الكفيل الخارجي</div>
                                        <input type="text" placeholder="اسم الكفيل الكامل" className="w-full p-3 rounded-lg border border-amber-200" value={sponsorshipMap[passengers[0].id]?.externalInfo?.fullName || ''} onChange={(e) => { let v = e.target.value; let m = { ...sponsorshipMap }; m[passengers[0].id] = { ...m[passengers[0].id], externalInfo: { ...m[passengers[0].id].externalInfo!, fullName: v } }; setSponsorshipMap(m); }} />
                                        <div className="grid grid-cols-2 gap-2">
                                            <select className="p-3 border rounded-lg bg-white" value={sponsorshipMap[passengers[0].id]?.externalInfo?.relation || ''} onChange={(e) => { let v = e.target.value; let m = { ...sponsorshipMap }; m[passengers[0].id] = { ...m[passengers[0].id], externalInfo: { ...m[passengers[0].id].externalInfo!, relation: v } }; setSponsorshipMap(m); }}>
                                                <option value="">صلة القرابة...</option>
                                                <option value="أب">أب</option><option value="أب">أم</option><option value="زوج">زوج</option><option value="زوجة">زوجة</option>
                                                <option value="قريب">قريب</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="text" placeholder="جهة عمل الكفيل" className="p-3 border rounded-lg" value={sponsorshipMap[passengers[0].id]?.externalInfo?.workPlace || ''} onChange={(e) => { let v = e.target.value; let m = { ...sponsorshipMap }; m[passengers[0].id] = { ...m[passengers[0].id], externalInfo: { ...m[passengers[0].id].externalInfo!, workPlace: v } }; setSponsorshipMap(m); }} />
                                            <input type="text" placeholder="مسمى الكفيل الوظيفي" className="p-3 border rounded-lg" value={sponsorshipMap[passengers[0].id]?.externalInfo?.jobTitle || ''} onChange={(e) => { let v = e.target.value; let m = { ...sponsorshipMap }; m[passengers[0].id] = { ...m[passengers[0].id], externalInfo: { ...m[passengers[0].id].externalInfo!, jobTitle: v } }; setSponsorshipMap(m); }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CASE 2: Minors ONLY - Mandatory External Sponsor */}
                        {isMinorsOnly && (
                            <div className="max-w-md mx-auto space-y-4">
                                <div className="text-center">
                                    <h2 className="2xl font-bold text-gray-800">بيانات الكفيل (للمسافرين القصر)</h2>
                                    <p className="text-gray-500 mt-2">يجب تحديد الشخص المتكفل بمصاريف القاصرين</p>
                                </div>
                                <div className="p-6 bg-amber-50 rounded-xl border border-amber-200 space-y-4">
                                    <div className="grid gap-4">
                                        <input type="text" placeholder="الاسم الكامل للمتكفل الكفيل" className="w-full p-3 rounded-lg border border-amber-200" value={sponsorshipMap[passengers[0].id]?.externalInfo?.fullName || ''} onChange={(e) => { let v = e.target.value; let m = { ...sponsorshipMap }; passengers.forEach(p => m[p.id] = { type: 'EXTERNAL', externalInfo: { ...m[p.id]?.externalInfo!, fullName: v } }); setSponsorshipMap(m); }} />
                                        <div className="grid grid-cols-2 gap-2">
                                            <select className="w-full p-3 rounded-lg border border-amber-200" value={sponsorshipMap[passengers[0].id]?.externalInfo?.relation || ''} onChange={(e) => { let v = e.target.value; let m = { ...sponsorshipMap }; passengers.forEach(p => m[p.id] = { type: 'EXTERNAL', externalInfo: { ...m[p.id]?.externalInfo!, relation: v } }); setSponsorshipMap(m); }}>
                                                <option value="">صلة القرابة...</option>
                                                <option value="أب">أب</option><option value="أم">أم</option><option value="أخ">أخ</option><option value="أخت">أخت</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="text" placeholder="جهة عمل الكفيل" className="w-full p-3 rounded-lg border border-amber-200" value={sponsorshipMap[passengers[0].id]?.externalInfo?.workPlace || ''} onChange={(e) => { let v = e.target.value; let m = { ...sponsorshipMap }; passengers.forEach(p => m[p.id] = { type: 'EXTERNAL', externalInfo: { ...m[p.id]?.externalInfo!, workPlace: v } }); setSponsorshipMap(m); }} />
                                            <input type="text" placeholder="المسمى الوظيفي" className="w-full p-3 rounded-lg border border-amber-200" value={sponsorshipMap[passengers[0].id]?.externalInfo?.jobTitle || ''} onChange={(e) => { let v = e.target.value; let m = { ...sponsorshipMap }; passengers.forEach(p => m[p.id] = { type: 'EXTERNAL', externalInfo: { ...m[p.id]?.externalInfo!, jobTitle: v } }); setSponsorshipMap(m); }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CASE 3: Mixed (Adults + Minors) OR Explicitly selected Family/Friends */}
                        {((isMixedFamily || isMultipleAdultsOnly) && (relationshipType === 'FAMILY' || isMixedFamily)) && (
                            <div className="max-w-md mx-auto space-y-6 pt-4">
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-800">بيانات كفالة العائلة</h2>
                                    <p className="text-gray-500">من هو الشخص المسؤول عن مصاريف الرحلة؟</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-600">اختر المتكفل...</label>
                                    <select className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 font-bold" onChange={(e) => {
                                        const val = e.target.value;
                                        const nm: any = {};
                                        if (val === 'EXTERNAL') passengers.forEach(p => nm[p.id] = { type: 'EXTERNAL', externalInfo: { relation: '', fullName: '', workPlace: '', jobTitle: '' } });
                                        else passengers.forEach(p => nm[p.id] = { type: 'PASSENGER', targetId: val, workPlace: '', jobTitle: '' });
                                        setSponsorshipMap(nm);
                                    }}>
                                        <option value="">اختر من القائمة...</option>
                                        {passengers.filter(p => p.type === 'ADULT').map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.fullName || getPassengerLabel(p, passengers.indexOf(p))}
                                            </option>
                                        ))}
                                        <option value="EXTERNAL">شخص آخر (من خارج الحجز)</option>
                                    </select>
                                </div>

                                {sponsorshipMap[Object.keys(sponsorshipMap)[0]]?.type === 'PASSENGER' && (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                                        <input type="text" placeholder="جهة العمل" className="p-3 border rounded-lg" value={sponsorshipMap[Object.keys(sponsorshipMap)[0]]?.workPlace || ''} onChange={(e) => { let v = e.target.value; let m = { ...sponsorshipMap }; Object.keys(m).forEach(k => m[k].workPlace = v); setSponsorshipMap(m); }} />
                                        <input type="text" placeholder="المسمى الوظيفي" className="p-3 border rounded-lg" value={sponsorshipMap[Object.keys(sponsorshipMap)[0]]?.jobTitle || ''} onChange={(e) => { let v = e.target.value; let m = { ...sponsorshipMap }; Object.keys(m).forEach(k => m[k].jobTitle = v); setSponsorshipMap(m); }} />
                                    </div>
                                )}

                                {sponsorshipMap[Object.keys(sponsorshipMap)[0]]?.type === 'EXTERNAL' && (
                                    <div className="p-6 bg-amber-50 rounded-xl border border-amber-200 space-y-4">
                                        <input type="text" placeholder="اسم الكفيل الكامل" className="w-full p-3 rounded-lg border border-amber-200" value={sponsorshipMap[Object.keys(sponsorshipMap)[0]]?.externalInfo?.fullName || ''} onChange={(e) => { let v = e.target.value; let m = { ...sponsorshipMap }; Object.keys(m).forEach(k => m[k].externalInfo!.fullName = v); setSponsorshipMap(m); }} />
                                        <div className="grid grid-cols-2 gap-2">
                                            <select className="p-3 border rounded-lg bg-white" value={sponsorshipMap[Object.keys(sponsorshipMap)[0]]?.externalInfo?.relation || ''} onChange={(e) => { let v = e.target.value; let m = { ...sponsorshipMap }; Object.keys(m).forEach(k => m[k].externalInfo!.relation = v); setSponsorshipMap(m); }}>
                                                <option value="">صلة القرابة...</option>
                                                <option value="أب">أب</option><option value="أم">أم</option><option value="أخ">أخ</option><option value="أخت">أخت</option>
                                                <option value="قريب">قريب</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="text" placeholder="جهة العمل" className="p-3 border rounded-lg" value={sponsorshipMap[Object.keys(sponsorshipMap)[0]]?.externalInfo?.workPlace || ''} onChange={(e) => { let v = e.target.value; let m = { ...sponsorshipMap }; Object.keys(m).forEach(k => m[k].externalInfo!.workPlace = v); setSponsorshipMap(m); }} />
                                            <input type="text" placeholder="المسمى الوظيفي" className="p-3 border rounded-lg" value={sponsorshipMap[Object.keys(sponsorshipMap)[0]]?.externalInfo?.jobTitle || ''} onChange={(e) => { let v = e.target.value; let m = { ...sponsorshipMap }; Object.keys(m).forEach(k => m[k].externalInfo!.jobTitle = v); setSponsorshipMap(m); }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CASE 4: Explicitly selected Friends */}
                        {relationshipType === 'FRIENDS' && !isMixedFamily && (
                            <div className="space-y-4 pt-4">
                                <h3 className="font-bold text-gray-800 text-center">كفالة الأصدقاء (كل مسافر على حدة)</h3>
                                {passengers.map((p, i) => (
                                    <div key={p.id} className="p-4 border rounded-xl bg-gray-50 flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold">{p.fullName || getPassengerLabel(p, i)}</span>
                                            <select className="p-2 border rounded" value={sponsorshipMap[p.id]?.type || 'SELF'} onChange={(e) => { let v = e.target.value as any; setSponsorshipMap({ ...sponsorshipMap, [p.id]: { type: v, externalInfo: v === 'EXTERNAL' ? { relation: '', fullName: '', workPlace: '', jobTitle: '' } : undefined } }); }}>
                                                <option value="SELF">يتكفل بنفسه</option>
                                                <option value="EXTERNAL">شخص خارجي</option>
                                            </select>
                                        </div>
                                        {sponsorshipMap[p.id]?.type === 'EXTERNAL' && (
                                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                                                <input type="text" placeholder="اسم الكفيل" className="p-2 border rounded text-xs" value={sponsorshipMap[p.id].externalInfo?.fullName || ''} onChange={(e) => { let v = e.target.value; setSponsorshipMap({ ...sponsorshipMap, [p.id]: { ...sponsorshipMap[p.id], externalInfo: { ...sponsorshipMap[p.id].externalInfo!, fullName: v } } }); }} />
                                                <select className="p-2 border rounded text-xs" value={sponsorshipMap[p.id].externalInfo?.relation || ''} onChange={(e) => { let v = e.target.value; setSponsorshipMap({ ...sponsorshipMap, [p.id]: { ...sponsorshipMap[p.id], externalInfo: { ...sponsorshipMap[p.id].externalInfo!, relation: v } } }); }}><option value="">صلة...</option><option value="أب">أب</option><option value="أم">أم</option></select>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between pt-6">
                            <Button variant="outline" onClick={() => setCurrentStep('passengers')}>السابق</Button>
                            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px]" onClick={handleSponsorshipSubmit}>مراجعة الطلب</Button>
                        </div>
                    </div>
                </div>
            )}

            {currentStep === 'review' && savedAppointmentData && (
                <div className="space-y-6 animate-in zoom-in-95 duration-500 pb-24 text-right" dir="rtl">
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden">
                        {/* Header Summary */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative">
                            <div className="absolute top-0 left-0 p-4 opacity-10">
                                <CheckCircle2 className="w-32 h-32" />
                            </div>
                            <h2 className="text-3xl font-bold mb-2">مراجعة الطلب النهائي</h2>
                            <p className="opacity-90">يرجى تحري الدقة في مراجعة البيانات قبل إنشاء الطلب</p>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Trip Info Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">تفاصيل الموعد</h3>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">🌍</div>
                                        <div>
                                            <div className="font-bold text-gray-800">{savedAppointmentData.appointment.countryName}</div>
                                            <div className="text-sm text-gray-500">{format(new Date(savedAppointmentData.appointment.date), "EEEE، d MMMM yyyy", { locale: arSA })}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">هيكل المجموعة</h3>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                                            {relationshipType === 'FAMILY' ? '👨‍👩‍👧‍👦' : relationshipType === 'FRIENDS' ? '🤝' : '👤'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800">{relationshipType === 'FAMILY' ? 'عائلة واحدة' : relationshipType === 'FRIENDS' ? 'مجموعة أصدقاء' : 'مسافر فردي'}</div>
                                            <div className="text-sm text-gray-500">{passengers.length} مسافرين في هذا الطلب</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info Card */}
                            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400">رقم جوال التواصل</div>
                                        <div className="font-bold text-gray-800 tracking-wider">0{phone}</div>
                                    </div>
                                </div>
                                <div className="flex gap-2 text-xs font-bold text-blue-600 bg-white px-3 py-1 rounded-full shadow-sm">
                                    <span>رقم التواصل المعتمد</span>
                                </div>
                            </div>

                            {/* Passengers List */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">قائمة المسافرين</h3>
                                <div className="grid gap-3">
                                    {passengers.map((p, i) => (
                                        <div key={p.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-white shadow-sm hover:border-blue-200 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">{i + 1}</div>
                                                <div>
                                                    <div className="font-bold text-gray-800">{p.fullName || 'لم يتم إدخال الاسم'}</div>
                                                    <div className="text-xs text-gray-400">هوية: {p.idNumber || '---'} | جواز: {p.passportNumber || '---'} | {getPassengerLabel(p, i)}</div>
                                                </div>
                                            </div>
                                            <div className="text-left">
                                                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold ring-1 ring-blue-100">
                                                    {(() => {
                                                        const s = sponsorshipMap[p.id];
                                                        if (s?.type === 'SELF') return 'كفالة ذاتية';
                                                        if (s?.type === 'EXTERNAL') return 'كفالة خارجية';
                                                        if (s?.type === 'PASSENGER') {
                                                            const sponsor = passengers.find(pa => pa.id === s.targetId);
                                                            return `كفالة: ${sponsor?.fullName || 'مسافر آخر'}`;
                                                        }
                                                        return 'غير محدد';
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Final Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                                <Button variant="outline" size="lg" onClick={() => setCurrentStep('sponsorship')} className="flex-1 py-6 order-2 sm:order-1">
                                    تعديل البيانات
                                </Button>
                                <Button size="lg" onClick={handleConfirmFinal} disabled={submitting} className="flex-1 py-6 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold text-lg shadow-lg shadow-green-100 order-1 sm:order-2">
                                    {submitting ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            جاري الحفظ...
                                        </div>
                                    ) : (
                                        'تأكيد وإنشاء الطلب'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
