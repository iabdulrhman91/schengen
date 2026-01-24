import { getSession, getAppointments, getCountriesAction, getLocationsAction } from "@/lib/actions";
import { AppointmentActions } from "./appointment-actions";
import { redirect } from "next/navigation";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@/components/ui/core";
import Link from "next/link";
import { Plus, Calendar, MapPin, Users, Globe } from "lucide-react"; // Added Globe

export default async function AppointmentsPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const appointments = await getAppointments();
    const countries = await getCountriesAction(false); // Fetch all to resolve names
    const locations = await getLocationsAction(false);

    // Helper to resolve names
    const getCountryName = (id: string) => countries.find(c => c.id === id)?.name_ar || 'غير معروف';
    const getLocationName = (id: string) => locations.find(l => l.id === id)?.name_ar || 'غير محدد';

    const renderFlag = (id: string) => {
        const c = countries.find(c => c.id === id);
        if (!c) return <span className="text-xl">🏳️</span>;

        if (c.iso_code) {
            return <span className={`fi fi-${c.iso_code.toLowerCase()} text-xl rounded shadow-sm inline-block`} />;
        }
        if (c.flag_image_url) {
            return <img src={c.flag_image_url} alt="flag" className="w-8 h-5 object-cover rounded shadow-sm inline-block" />;
        }
        if (c.flag_emoji) return <span className="text-xl">{c.flag_emoji}</span>;
        if (c.code === 'SPAIN') return <span className="text-xl">🇪🇸</span>;
        if (c.code === 'FRANCE') return <span className="text-xl">🇫🇷</span>;
        return <span className="text-xl">🏳️</span>;
    };

    // Sort by date desc
    const sortedAppointments = [...appointments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const canEdit = session?.role === 'ADMIN' || session?.role === 'VISA_MANAGER' || session?.role === 'MASTER_ADMIN';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">قائمة مواعيد البصمة</h1>
                {canEdit && (
                    <Link href="/appointments/new">
                        <Button>+ إضافة موعد جديد</Button>
                    </Link>
                )}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                الدولة
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                التاريخ
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                التفاصيل (الموقع - السعة)
                            </th>
                            {canEdit && <th className="relative px-6 py-3"><span className="sr-only">الإجراءات</span></th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedAppointments.map((appt) => (
                            <tr key={appt.id}>

                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex items-center gap-2 text-gray-900 font-medium">
                                        {renderFlag(appt.countryId)}
                                        <span>{getCountryName(appt.countryId)}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right" dir="ltr">
                                    {new Date(appt.date).toLocaleDateString('en-GB')}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-semibold text-gray-800">{getLocationName(appt.locationId)}</span>
                                        <span className="text-gray-500 text-xs">عام: {appt.capacity} | مميز: {appt.capacity_vip || 0}</span>
                                    </div>
                                </td>
                                {canEdit && (
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <AppointmentActions
                                            id={appt.id}
                                            currentCapacity={appt.capacity}
                                            currentCapacityVip={appt.capacity_vip}
                                            currentStatus={appt.status}
                                            currentDate={appt.date}
                                            currentCountryId={appt.countryId}
                                            currentLocationId={appt.locationId}
                                            countries={countries.map(c => ({ id: c.id, name_ar: c.name_ar }))}
                                            locations={locations.map(l => ({ id: l.id, name_ar: l.name_ar }))}
                                        />
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {appointments.length === 0 && (
                    <div className="p-6 text-center text-gray-500">لا توجد مواعيد متاحة</div>
                )}
            </div>
        </div>
    );
}
