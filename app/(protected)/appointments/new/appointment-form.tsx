'use client';

import { useState } from "react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/core";
import Link from "next/link";
import { ComboboxWithCreate } from "@/components/ui/combobox-with-create";
// import { CustomDatePicker } from "@/components/ui/date-picker";
import { createAppointmentAction, createCountryAction, createLocationAction, toggleCountryStatusAction, toggleLocationStatusAction, deleteCountryAction, deleteLocationAction, updateCountryAction, uploadCountryFlagAction } from "@/lib/actions";
import { Country, Location } from "@/lib/storage/types";
import { useRouter } from "next/navigation";

interface AppointmentFormProps {
    initialCountries: Country[];
    initialLocations: Location[];
    userRole: string; // 'ADMIN' | 'VISA_MANAGER' etc
}

export default function AppointmentForm({ initialCountries, initialLocations, userRole }: AppointmentFormProps) {
    const router = useRouter();
    const isAdmin = userRole === 'ADMIN' || userRole === 'VISA_MANAGER'; // Only these can access this page anyway

    // State for lists (optimistic or re-fetched)
    const [countries, setCountries] = useState<Country[]>(initialCountries);
    const [locations, setLocations] = useState<Location[]>(initialLocations);

    // Form State - selectedCountry/City now stores ID
    const [selectedCountry, setSelectedCountry] = useState<string>(
        initialCountries.find(c => c.code === 'SPAIN')?.id || initialCountries[0]?.id || ''
    );
    const [selectedCity, setSelectedCity] = useState<string>('');
    // const [date, setDate] = useState<Date | undefined>(undefined);

    // --- Handlers for Country ---
    const handleCreateCountry = async (name: string) => {
        try {
            const flag = prompt("أدخل كود الدولة (مثل ES, FR) أو رمز تعبيري:", "ES") || undefined;
            const result = await createCountryAction({ name_ar: name, flag_emoji: flag });
            if (result.success && result.data) {
                setCountries([...countries, result.data]);
                setSelectedCountry(result.data.id); // Auto select ID
                alert("تم إضافة الدولة بنجاح");
            } else {
                alert("فشل إضافة الدولة: " + (result.error || "خطأ غير معروف"));
            }
        } catch (e) {
            alert("فشل إضافة الدولة");
        }
    };

    const handleToggleCountry = async (id: string, currentStatus: boolean) => {
        try {
            const updated = await toggleCountryStatusAction(id, currentStatus);
            setCountries(countries.map(c => c.id === id ? updated : c));
        } catch (e) {
            alert("فشل تحديث الحالة");
        }
    };

    const handleDeleteCountry = async (id: string) => {
        try {
            await deleteCountryAction(id);
            setCountries(countries.filter(c => c.id !== id));
        } catch (e) {
            alert("فشل الحذف");
        }
    };

    const handleUpdateCountryMeta = async (id: string, type: string, value: string) => {
        try {
            if (type === 'FLAG') {
                // If 2 chars, send as iso_code, else flag_emoji (handled by action)
                // Actually action takes a single object currently but we modified it?
                // Step 2665 shows updateCountryAction takes data { flag_emoji, flag_image_url, iso_code, name_ar }
                // We need to parse 'value' here or update action to handle the parsing.
                // Action logic for CREATE handles dual input. Action logic for UPDATE was just taking specific fields.
                // Let's replicate the heuristic here or update the action to be smarter.
                // Better: Update the action to be smarter (it is standard 'updateCountryAction').
                // Wait, I updated `createCountryAction` to use heuristic. `updateCountryAction` just blindly takes the data object.
                // So I should do the heuristic HERE in the client.

                const isIso = value && value.length === 2 && /^[a-zA-Z]+$/.test(value);
                const updateData = isIso ? { iso_code: value.toLowerCase() } : { flag_emoji: value };

                const result = await updateCountryAction(id, updateData);
                if (result.success && result.data) {
                    setCountries(countries.map(c => c.id === id ? result.data : c));
                }
            }
        } catch (e) {
            alert("فشل تحديث المعلومات");
        }
    };

    const handleUploadFlag = async (id: string, file: File) => {
        try {
            const formData = new FormData();
            formData.append('countryId', id);
            formData.append('file', file);

            // Should return updated country logic if action returned country object?
            // Action currently returns { success: true, url: string }
            // We need to update local state logic or re-fetch.
            // Let's assume revalidatePath triggers server re-render but for optimistic UI or client state update:
            const result = await uploadCountryFlagAction(formData);
            if (result.success) {
                setCountries(countries.map(c => c.id === id ? { ...c, flag_image_url: result.url } : c));
            }
        } catch (e) {
            alert("فشل رفع الصورة");
        }
    };

    // --- Handlers for Location ---
    const handleCreateLocation = async (name: string) => {
        try {
            const result = await createLocationAction(name);
            if (result.success && result.data) {
                setLocations([...locations, result.data]);
                setSelectedCity(result.data.id); // Auto select ID
                alert("تم إضافة الموقع بنجاح");
            } else {
                alert("فشل إضافة الموقع: " + (result.error || "خطأ غير معروف"));
            }
        } catch (e) {
            alert("فشل إضافة الموقع");
        }
    };

    const handleToggleLocation = async (id: string, currentStatus: boolean) => {
        try {
            const updated = await toggleLocationStatusAction(id, currentStatus);
            setLocations(locations.map(l => l.id === id ? updated : l));
        } catch (e) {
            alert("فشل تحديث الحالة");
        }
    };

    const handleDeleteLocation = async (id: string) => {
        try {
            await deleteLocationAction(id);
            setLocations(locations.filter(l => l.id !== id));
        } catch (e) {
            alert("فشل الحذف");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>بيانات الموعد</CardTitle>
            </CardHeader>
            <CardContent>
                <form action={createAppointmentAction} className="space-y-4">
                    {/* Row 1: Date and Country */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">التاريخ</Label>
                            <Input
                                id="date"
                                type="date"
                                name="date"
                                className="block w-full text-right"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Input type="hidden" name="countryId" value={selectedCountry} />
                            <ComboboxWithCreate
                                label="الدولة"
                                items={countries.map(c => ({
                                    id: c.id,
                                    label: c.name_ar,
                                    value: c.id,
                                    isActive: c.is_active,
                                    iso_code: c.iso_code,
                                    flag: c.flag_image_url || c.flag_emoji // Prioritize image still if exists, but iso_code is top priority in UI logic
                                }))}
                                selectedValue={selectedCountry}
                                onSelect={setSelectedCountry}
                                onCreate={handleCreateCountry}
                                onToggleStatus={handleToggleCountry}
                                onDelete={handleDeleteCountry}
                                onUpdateMeta={handleUpdateCountryMeta}
                                onUploadFlag={handleUploadFlag}
                                isAdmin={isAdmin}
                                placeholder="اختر الدولة..."
                            />
                        </div>
                    </div>

                    {/* Row 2: Location and Capacity */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Input type="hidden" name="locationId" value={selectedCity} />
                            <ComboboxWithCreate
                                label="الموقع / الفرع"
                                items={locations.map(l => ({
                                    id: l.id,
                                    label: l.name_ar,
                                    value: l.id,
                                    isActive: l.is_active
                                }))}
                                selectedValue={selectedCity}
                                onSelect={setSelectedCity}
                                onCreate={handleCreateLocation}
                                onToggleStatus={handleToggleLocation}
                                onDelete={handleDeleteLocation}
                                isAdmin={isAdmin}
                                placeholder="اختر الموقع..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="capacity">السعة (عام)</Label>
                                <Input
                                    id="capacity"
                                    name="capacity"
                                    type="number"
                                    min="1"
                                    placeholder="35"
                                    required
                                    className="text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="capacity_vip" className="text-amber-600 font-bold">VIP (كبار الشخصيات)</Label>
                                <Input
                                    id="capacity_vip"
                                    name="capacity_vip"
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="text-right bg-amber-50 border-amber-200 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                        </div>
                    </div>



                    <div className="pt-4">
                        <Button type="submit" className="w-full">
                            حفظ وإضافة الموعد
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card >
    );
}
