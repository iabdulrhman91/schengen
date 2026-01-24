import { getCountriesAction, getLocationsAction } from "@/lib/actions";
import Link from "next/link";
import { ArrowRight, CalendarPlus } from "lucide-react";
import NewAppointmentForm from "@/components/admin/NewAppointmentForm";

export default async function NewAppointmentPage() {
    // 1. Fetch Catalogs (Active Only + Required PriceBook)
    const countries = await getCountriesAction(true, true);
    const locations = await getLocationsAction(true);

    return (
        <div dir="rtl" className="container mx-auto p-6 max-w-2xl min-h-[90vh] flex flex-col">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-100">
                        <CalendarPlus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">إضافة موعد جديد</h1>
                        <p className="text-xs font-bold text-gray-400 mt-0.5 uppercase tracking-widest">إدارة المواعيد المتاحة للحجز</p>
                    </div>
                </div>

                <Link href="/appointments" className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                    <span>العودة للمقائمة</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                </Link>
            </div>

            <NewAppointmentForm countries={countries} locations={locations} />
        </div>
    );
}
