"use client";

import { useState } from "react";
import { createAppointmentAction } from "@/lib/actions";
import { Button } from "@/components/ui/core";
import { CustomDatePicker } from "@/components/ui/date-picker";
import { Calendar, Globe, MapPin, Users, Info } from "lucide-react";
import { cn } from "@/components/ui/core";

interface NewAppointmentFormProps {
    countries: any[];
    locations: any[];
}

export default function NewAppointmentForm({ countries, locations }: NewAppointmentFormProps) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setSubmitting(true);
        try {
            // The action is a server action, it will handle the redirect if success
            await createAppointmentAction(formData);
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء حفظ الموعد");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form action={handleSubmit} className="space-y-6 bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-500">

            {/* DATE */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mr-1">
                    <Calendar size={16} className="text-blue-500" />
                    التاريخ
                </label>
                <CustomDatePicker
                    value={selectedDate}
                    onChange={setSelectedDate}
                    name="date"
                    required
                    placeholder="اختر تاريخ الموعد..."
                    className="h-12 text-lg shadow-sm border-gray-200 focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-gray-400 mr-1">تحديد اليوم المتاح لتقديم الطلبات في المركز</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* COUNTRY */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mr-1">
                        <Globe size={16} className="text-blue-500" />
                        الدولة
                    </label>
                    <select
                        name="countryId"
                        required
                        className="w-full h-12 border border-gray-200 rounded-xl px-4 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-700 appearance-none"
                    >
                        <option value="">-- اختر الدولة --</option>
                        {countries.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name_ar} ({(c.code || c.iso_code || 'N/A').toUpperCase()})
                            </option>
                        ))}
                    </select>
                </div>

                {/* LOCATION */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mr-1">
                        <MapPin size={16} className="text-blue-500" />
                        المدينة / المركز
                    </label>
                    <select
                        name="locationId"
                        required
                        className="w-full h-12 border border-gray-200 rounded-xl px-4 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-700 appearance-none"
                    >
                        <option value="">-- اختر المركز --</option>
                        {locations.map(l => (
                            <option key={l.id} value={l.id}>
                                {l.name_ar}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* CAPACITY */}
            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 mb-4 text-gray-800">
                    <Users size={18} className="text-blue-500" />
                    <span className="font-bold text-sm">توزيع المقاعد المتاحة</span>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">عدد المقاعد (عادي)</label>
                        <input
                            type="number"
                            name="capacity"
                            defaultValue={1}
                            min={0}
                            className="w-full h-11 border border-gray-200 rounded-xl px-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono font-bold"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">عدد المقاعد (VIP)</label>
                        <input
                            type="number"
                            name="capacity_vip"
                            defaultValue={0}
                            min={0}
                            className="w-full h-11 border border-gray-200 rounded-xl px-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono font-bold"
                        />
                    </div>
                </div>
            </div>

            {/* INFO BOX */}
            {countries.length === 0 && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                    <Info className="text-red-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-red-600 font-medium">
                        يجب إضافة دولة وتعيين قائمة أسعار افتراضية لها من "إدارة الأسعار" قبل إضافة المواعيد.
                    </p>
                </div>
            )}

            {/* SUBMIT */}
            <Button
                type="submit"
                size="lg"
                className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-lg shadow-lg shadow-blue-100 rounded-2xl transition-all"
                disabled={countries.length === 0 || locations.length === 0 || submitting}
            >
                {submitting ? "جاري الحفظ..." : "حفظ الموعد"}
            </Button>
        </form>
    );
}
