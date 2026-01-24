'use client';

import { Button, Input, Label } from "@/components/ui/core";
import { Modal } from "@/components/ui/modal";
import { Pencil, Trash, MoreVertical, CheckCircle, XCircle, AlertCircle, PlayCircle } from "lucide-react";
import { updateAppointmentStatusAction, deleteAppointmentAction } from "@/lib/actions";
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EnglishNumberInput } from "@/components/ui/english-input";
import { ComboboxWithCreate } from "@/components/ui/combobox-with-create";
import { CustomDatePicker } from "@/components/ui/date-picker";

interface AppointmentActionsProps {
    id: string;
    currentCapacity: number;
    currentCapacityVip?: number;
    currentStatus: string;
    currentDate: string;
    currentCountryId: string;
    currentLocationId: string;
    countries: { id: string; name_ar: string }[];
    locations: { id: string; name_ar: string }[];
}

export function AppointmentActions({
    id,
    currentCapacity,
    currentCapacityVip,
    currentStatus,
    currentDate,
    currentCountryId,
    currentLocationId,
    countries,
    locations
}: AppointmentActionsProps) {
    const [editOpen, setEditOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [editDate, setEditDate] = useState<Date | undefined>(currentDate ? new Date(currentDate) : undefined);
    const [selectedCountry, setSelectedCountry] = useState(currentCountryId);
    const [selectedLocation, setSelectedLocation] = useState(currentLocationId);

    const [statusOpen, setStatusOpen] = useState(false);

    // Sync state with props when modal opens or props change
    const editKey = id;

    useEffect(() => {
        if (!editOpen) return;
        setEditDate(currentDate ? new Date(currentDate) : undefined);
        setSelectedCountry(currentCountryId);
        setSelectedLocation(currentLocationId);
    }, [editOpen, editKey]);

    const handleUpdate = async (formData: FormData) => {
        setIsPending(true);
        // Date is handled by native input name="date"
        if (selectedCountry) formData.set('countryId', selectedCountry);
        if (selectedLocation) formData.set('locationId', selectedLocation);

        await updateAppointmentStatusAction(id, formData);
        setIsPending(false);
        setEditOpen(false);
    };

    const handleQuickStatus = async (newStatus: string) => {
        setIsPending(true);
        const formData = new FormData();
        formData.append('status', newStatus);

        // Preserve other values if cleaner, but action handles partial update nicely now?
        // Wait, action wipes data if not present?
        // My action implementation:
        // if (formData.has('status')) data.status = ...
        // if (formData.has('capacity')) ...
        // It creates `data: any = {}` and only adds what's in formData.
        // And JSON adapter `updateAppointment` merges: `db.appointments[idx] = { ...db.appointments[idx], ...data }`
        // So partial update works perfectly.

        await updateAppointmentStatusAction(id, formData);
        setIsPending(false);
        setStatusOpen(false);
    };

    const handleDelete = async () => {
        if (!confirm("⚠️ تحذير: هل أنت متأكد من حذف هذا الموعد نهائياً؟")) return;
        setIsPending(true);
        await deleteAppointmentAction(id);
        setIsPending(false);
    };

    return (
        <>
            <div className="flex items-center justify-end gap-1 relative">
                {/* Quick Status */}
                <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 ${currentStatus === 'OPEN' ? 'text-green-600 hover:bg-green-50' :
                                currentStatus === 'FULL' ? 'text-red-600 hover:bg-red-50' :
                                    currentStatus === 'COMPLETED' ? 'text-blue-600 hover:bg-blue-50' :
                                        'text-gray-400 hover:bg-gray-100'
                                }`}
                            title="تغيير الحالة سريعاً"
                            disabled={isPending}
                        >
                            {isPending ? <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-1" align="end">
                        <div className="flex flex-col gap-1">
                            <button onClick={() => handleQuickStatus('OPEN')} className="w-full text-right px-3 py-2 text-xs hover:bg-green-50 text-green-700 flex items-center gap-2 rounded-sm transition-colors">
                                <CheckCircle className="h-3 w-3" /> مفتوح
                            </button>
                            <button onClick={() => handleQuickStatus('FULL')} className="w-full text-right px-3 py-2 text-xs hover:bg-red-50 text-red-700 flex items-center gap-2 rounded-sm transition-colors">
                                <XCircle className="h-3 w-3" /> مكتمل
                            </button>
                            <button onClick={() => handleQuickStatus('CANCELLED')} className="w-full text-right px-3 py-2 text-xs hover:bg-gray-50 text-gray-700 flex items-center gap-2 rounded-sm transition-colors">
                                <AlertCircle className="h-3 w-3" /> ملغي
                            </button>
                            <button onClick={() => handleQuickStatus('COMPLETED')} className="w-full text-right px-3 py-2 text-xs hover:bg-blue-50 text-blue-700 flex items-center gap-2 rounded-sm transition-colors">
                                <CheckCircle className="h-3 w-3" /> منتهي
                            </button>
                        </div>
                    </PopoverContent>
                </Popover>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setEditOpen(true)}
                    title={currentStatus === 'OPEN' ? "تعديل شامل" : "التعديل متاح فقط للمواعيد المفتوحة"}
                    disabled={currentStatus !== 'OPEN'}
                >
                    <Pencil className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleDelete}
                    title={currentStatus === 'CANCELLED' ? "حذف نهائي" : "يجب إلغاء الموعد أولاً للحذف"}
                    disabled={currentStatus !== 'CANCELLED'}
                >
                    <Trash className="h-4 w-4" />
                </Button>
            </div>

            {/* Edit Modal */}
            <Modal open={editOpen} onClose={() => setEditOpen(false)} title="تعديل تفاصيل الموعد">
                <form action={handleUpdate} className="space-y-6">
                    {/* Date and Country/Location */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>التاريخ</Label>
                            <CustomDatePicker
                                value={editDate}
                                onChange={setEditDate}
                                name="date"
                                required
                                placeholder="اختر تاريخ الموعد..."
                                className="h-11 shadow-sm border-gray-200 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>الدولة</Label>
                            <input type="hidden" name="countryId" value={selectedCountry} />
                            <ComboboxWithCreate
                                label=""
                                items={countries.map(c => ({ id: c.id, value: c.id, label: c.name_ar, isActive: true }))}
                                selectedValue={selectedCountry}
                                onSelect={setSelectedCountry}
                                onCreate={async () => { }}
                                onToggleStatus={async () => { }}
                                placeholder="اختر دولة..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>الموقع (المدينة)</Label>
                        <input type="hidden" name="locationId" value={selectedLocation} />
                        <ComboboxWithCreate
                            label=""
                            items={locations.map(l => ({ id: l.id, value: l.id, label: l.name_ar, isActive: true }))}
                            selectedValue={selectedLocation}
                            onSelect={setSelectedLocation}
                            onCreate={async () => { }}
                            onToggleStatus={async () => { }}
                            placeholder="اختر مدينة..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-gray-600 block mb-1">السعة (عام)</Label>
                            <EnglishNumberInput
                                type="number"
                                name="capacity"
                                defaultValue={currentCapacity}
                                className="text-lg text-center bg-gray-50 border-gray-200 focus:bg-white transition-colors h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-amber-600 font-bold block mb-1">مميز</Label>
                            <EnglishNumberInput
                                type="number"
                                name="capacity_vip"
                                defaultValue={currentCapacityVip || 0}
                                className="text-lg text-center bg-amber-50 border-amber-200 text-amber-900 focus:ring-amber-500 h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                    </div>



                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>إلغاء</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
