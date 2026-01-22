import { createAppointmentAction, getCountriesAction, getLocationsAction } from "@/lib/actions"; // Assuming these exist
import { Button } from "@/components/ui/core";
import Link from "next/link";
import { ArrowBigRight } from "lucide-react";

export default async function NewAppointmentPage() {
    // 1. Fetch Catalogs (Active Only + Required PriceBook)
    const countries = await getCountriesAction(true, true);
    const locations = await getLocationsAction(true);

    return (
        <div className="container mx-auto p-4 max-w-lg">
            <div className="mb-6 flex items-center gap-2">
                <Link href="/appointments" className="text-gray-500 hover:text-gray-700">
                    <ArrowBigRight className="w-6 h-6 rotate-180" />
                </Link>
                <h1 className="text-2xl font-bold">موعد جديد</h1>
            </div>

            <form action={createAppointmentAction} className="space-y-6 bg-white p-6 rounded-lg shadow border">

                {/* DATE */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                    <input
                        type="date"
                        name="date"
                        required
                        className="w-full border rounded p-2"
                    />
                </div>

                {/* COUNTRY (Strict Select) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الدولة</label>
                    <select name="countryId" required className="w-full border rounded p-2 bg-white">
                        <option value="">-- اختر الدولة --</option>
                        {countries.length > 0 ? countries.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name_ar} ({(c.code || c.iso_code || 'N/A').toUpperCase()})
                            </option>
                        )) : (
                            <option disabled>لا توجد دول متاحة (تحتاج إلى تفعيل وقائمة أسعار افتراضية)</option>
                        )}
                    </select>
                    {countries.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">يجب إضافة دولة وتعيين قائمة أسعار افتراضية لها من "إدارة الأسعار"</p>
                    )}
                </div>

                {/* LOCATION (Strict Select) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المدينة / المركز</label>
                    <select name="locationId" required className="w-full border rounded p-2 bg-white">
                        <option value="">-- اختر المركز --</option>
                        {locations.length > 0 ? locations.map(l => (
                            <option key={l.id} value={l.id}>
                                {l.name_ar}
                            </option>
                        )) : (
                            <option disabled>لا توجد مراكز مفعلة (راجع إدارة الأسعار)</option>
                        )}
                    </select>
                </div>

                {/* VISAS COUNT */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">عدد المقاعد (عادي)</label>
                        <input type="number" name="capacity" defaultValue={1} min={0} className="w-full border rounded p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">عدد المقاعد (VIP)</label>
                        <input type="number" name="capacity_vip" defaultValue={0} min={0} className="w-full border rounded p-2" />
                    </div>
                </div>

                {/* SUBMIT */}
                <Button type="submit" className="w-full" disabled={countries.length === 0 || locations.length === 0}>
                    حفظ الموعد
                </Button>
            </form>
        </div>
    );
}
