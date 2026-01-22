import { getSession } from "@/lib/actions";
import { storage } from "@/lib/storage";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/core";
import Link from "next/link";
import { PromoteButton } from "./promote-button";
import { notFound } from "next/navigation";

export default async function AppointmentDetailsPage({ params }: { params: { id: string } }) {
    const session = await getSession();
    // Role check: Admin/Visa only? 
    // Requirement 4: "Server-side isolation". 
    // If user is Agency, they shouldn't see this internal page or should see restricted view.
    // The plan said "UI: Appointment Details Page". Usually Internal use.
    // Let's protect it: Admin/Visa/Employee only can see details.
    if (!session || (session.role === 'AGENCY_USER' || session.role === 'AGENCY_MANAGER')) {
        return <div className="p-6">لا تملك صلاحية الوصول لهذه الصفحة.</div>;
    }

    const appointment = await storage.getAppointment(params.id);
    if (!appointment) return notFound();

    // Fetch Cases
    const cases = await storage.getCases({ appointmentId: appointment.id });

    const confirmed = cases.filter(c => c.statusId === 'os-ready' && c.lockStatus === 'SUBMITTED');
    const waiting = cases.filter(c => c.statusId === 'os-new' && c.lockStatus === 'SUBMITTED');

    // Logic: Can Promote?
    const isAuthorized = session.role === 'ADMIN' || session.role === 'VISA_MANAGER';
    const hasCapacity = confirmed.length < appointment.capacity;
    const isOpen = appointment.status === 'OPEN';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">تفاصيل الموعد: {appointment.code}</h1>
                <Link href="/appointments">
                    <Button variant="outline">عودة للقائمة</Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{appointment.capacity}</div>
                        <div className="text-sm text-gray-500">السعة الكلية</div>
                    </CardContent>
                </Card>
                <Card className="bg-green-50">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-700">{confirmed.length}</div>
                        <div className="text-sm text-green-600">المؤكدة</div>
                    </CardContent>
                </Card>
                <Card className="bg-orange-50">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-orange-700">{waiting.length}</div>
                        <div className="text-sm text-orange-600">قائمة الانتظار</div>
                    </CardContent>
                </Card>
                <Card className={hasCapacity ? 'bg-gray-50' : 'bg-red-50'}>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{appointment.capacity - confirmed.length}</div>
                        <div className="text-sm text-gray-500">المقاعد المتاحة</div>
                    </CardContent>
                </Card>
            </div>

            {/* Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Confirmed List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-green-700">القائمة المؤكدة ({confirmed.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {confirmed.length === 0 ? <p className="text-gray-400">لا يوجد طلبات مؤكدة.</p> : (
                            <ul className="space-y-3">
                                {confirmed.map(c => (
                                    <li key={c.id} className="p-3 bg-gray-50 rounded flex justify-between">
                                        <span>{c.fileNumber}</span>
                                        <span className="text-xs bg-green-200 text-green-800 px-2 rounded-full flex items-center">مؤكد ✅</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Waiting List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-orange-700">قائمة الانتظار ({waiting.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {waiting.length === 0 ? <p className="text-gray-400">لا يوجد طلبات في الانتظار.</p> : (
                            <ul className="space-y-3">
                                {waiting.map(c => (
                                    <li key={c.id} className="p-3 bg-gray-50 rounded flex justify-between items-center">
                                        <span>{c.fileNumber}</span>
                                        <div>
                                            {isAuthorized && isOpen && hasCapacity ? (
                                                <PromoteButton caseId={c.id} />
                                            ) : (
                                                <span className="text-xs text-gray-400">
                                                    {!isOpen ? 'الموعد مغلق' : !hasCapacity ? 'السعة ممتلئة' : 'غير مصرح للترقية'}
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
