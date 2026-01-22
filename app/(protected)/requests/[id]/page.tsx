import { getSession } from "@/lib/actions";
import { storage } from "@/lib/storage";
import { Button, Card, CardContent, CardHeader, CardTitle, Label, Input } from "@/components/ui/core";
import Link from "next/link";
import { createAmendmentRequestAction } from "@/lib/actions";
import { notFound } from "next/navigation";

export default async function CaseDetailsPage({ params }: { params: { id: string } }) {
    const session = await getSession();
    if (!session) return <div className="p-6">Unauthorized</div>;

    const myCase = await storage.getCase(params.id);
    if (!myCase) return notFound();

    // Security
    if (session.agencyId && myCase.agencyId !== session.agencyId) {
        if (session.role === 'AGENCY_USER' || session.role === 'AGENCY_MANAGER') {
            return <div className="p-6">Unauthorized access to case</div>;
        }
    }

    const appointment = myCase.appointmentId ? await storage.getAppointment(myCase.appointmentId) : null;
    const requests = await storage.getAmendmentRequests({ caseId: myCase.id });
    const statuses = await storage.getOperationalStatuses();
    const currentStatusLabel = statuses.find(s => s.id === myCase.statusId)?.label || "غير محدد";

    // For Reschedule Form: Fetch open appointments
    const allAppointments = await storage.getAppointments();
    const openAppointments = allAppointments.filter(a => a.status === 'OPEN');

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">تفاصيل الطلب: {myCase.fileNumber}</h1>
                <Link href="/requests">
                    <Button variant="outline">عودة للقائمة</Button>
                </Link>
            </div>

            {myCase.statusId === 'os-new' && (
                <Card className="border-orange-500 bg-orange-50">
                    <CardHeader><CardTitle className="text-orange-700">تغيير الموعد (مطلوب)</CardTitle></CardHeader>
                    <CardContent>
                        <p className="mb-4 text-sm">تمت الموافقة على طلب التأجيل. يرجى اختيار الموعد الجديد:</p>
                        <form action={async (formData) => {
                            'use server';
                            // Dynamic import action to avoid circular deps if any, or just inline logic/bind
                            const { rescheduleCaseAction } = await import("@/lib/actions");
                            await rescheduleCaseAction(params.id, formData);
                        }}>
                            <div className="flex gap-4">
                                <select name="appointmentId" required className="flex-1 h-10 border rounded px-3 bg-white">
                                    {openAppointments.map(a => (
                                        <option key={a.id} value={a.id}>{a.code} - {a.date.split('T')[0]}</option>
                                    ))}
                                </select>
                                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white">
                                    تأكيد الموعد الجديد
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {myCase.lockStatus === 'EDIT_OPEN' && (
                <Card className="border-blue-500 bg-blue-50">
                    <CardHeader><CardTitle className="text-blue-700">تعديل الطلب متاح</CardTitle></CardHeader>
                    <CardContent className="flex justify-between items-center">
                        <p className="text-sm">الملف مفتوح للتعديل. يمكنك تعديل البيانات الآن.</p>
                        <Link href={`/requests/${myCase.id}/applicant`}>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white">تعديل البيانات ✏️</Button>
                        </Link>
                    </CardContent>
                </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>بيانات الطلب</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">الحالة:</span>
                            <span className="font-bold text-blue-600">{currentStatusLabel}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">الموعد:</span>
                            <span className="font-bold">{appointment?.code || 'لم يحدد'}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">عدد المتقدمين:</span>
                            <span className="font-bold">{myCase.applicants.length}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* INVOICE SNAPSHOT */}
                <Card className="h-full">
                    <CardHeader className="bg-gray-50 border-b py-3">
                        <CardTitle className="flex justify-between items-center text-base">
                            <span>تفاصيل الفاتورة (نسخة مثبتة)</span>
                            {myCase.pricingSnapshot && (
                                <span className="text-xs font-normal text-gray-500 bg-white px-2 py-1 border rounded">
                                    {myCase.pricingSnapshot.createdAt.split('T')[0]}
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {myCase.pricingSnapshot ? (
                            <div className="space-y-4">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-gray-500 border-b">
                                            <th className="text-right pb-2">البيان</th>
                                            <th className="text-center pb-2">العدد</th>
                                            <th className="text-left pb-2">الإفرادي</th>
                                            <th className="text-left pb-2">الإجمالي</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {['adult', 'child', 'infant'].map(type => {
                                            // @ts-ignore
                                            const count = myCase.pricingSnapshot.counts[type];
                                            if (!count) return null;
                                            const unitName = type === 'adult' ? 'بالغ' : type === 'child' ? 'طفل' : 'رضيع';
                                            const seatType = myCase.pricingSnapshot!.seatType === 'VIP' ? 'VIP' : 'عادي';
                                            // @ts-ignore
                                            const price = myCase.pricingSnapshot.seatType === 'VIP' ? myCase.pricingSnapshot.unitPrices.vip[type] : myCase.pricingSnapshot.unitPrices.normal[type];
                                            return (
                                                <tr key={type}>
                                                    <td className="py-2 text-gray-700">{unitName} ({seatType})</td>
                                                    <td className="py-2 text-center">{count}</td>
                                                    <td className="py-2 text-left tabular-nums text-gray-600">{price}</td>
                                                    <td className="py-2 text-left tabular-nums font-medium">{price * count}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="border-t-2 border-gray-100">
                                        <tr>
                                            <td colSpan={3} className="pt-3 font-bold text-gray-800">المجموع النهائي</td>
                                            <td className="pt-3 font-bold text-left text-lg text-blue-800">
                                                {myCase.pricingSnapshot.totals.total} <span className="text-xs font-normal text-gray-500">SAR</span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>

                                {/* ADMIN DEBUG / SOURCE INFO */}
                                {(session.role === 'ADMIN' || session.role === 'VISA_MANAGER') && (
                                    <div className="bg-slate-50 rounded p-2 text-[10px] text-gray-400 mt-4 border border-slate-100">
                                        <div><strong>Applied Rules:</strong></div>
                                        <div>Base: <span className="font-mono">{myCase.pricingSnapshot.appliedFrom.basePriceBookId || 'N/A'}</span></div>
                                        <div>Override: <span className="font-mono text-orange-600">{myCase.pricingSnapshot.appliedFrom.cityOverrideId || 'None'}</span></div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                                لا توجد فاتورة مثبتة لهذا الطلب (نظام قديم)
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>طلب تعديل / إلغاء</CardTitle></CardHeader>
                    <CardContent>
                        <form action={async (formData) => {
                            "use server";
                            await createAmendmentRequestAction(formData);
                        }} className="space-y-4">
                            <input type="hidden" name="caseId" value={myCase.id} />

                            <div className="space-y-2">
                                <Label>نوع الطلب</Label>
                                <select name="type" className="w-full h-10 border rounded px-3 bg-white" required>
                                    <option value="EDIT">تعديل بيانات</option>
                                    <option value="CANCEL">إلغاء الطلب</option>
                                    <option value="RESCHEDULE">تأجيل/تغيير موعد</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>التفاصيل (السبب)</Label>
                                <Input name="details" required placeholder="اشرح سبب الطلب..." />
                            </div>

                            <Button type="submit" className="w-full bg-blue-600 text-white">
                                إرسال الطلب للمراجعة
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>سجل الطلبات السابقة</CardTitle></CardHeader>
                <CardContent>
                    {requests.length === 0 ? <p className="text-gray-400">لا يوجد طلبات سابقة.</p> : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="text-right py-2">النوع</th>
                                    <th className="text-right py-2">الحالة</th>
                                    <th className="text-right py-2">التفاصيل</th>
                                    <th className="text-right py-2">التاريخ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(r => (
                                    <tr key={r.id} className="border-t">
                                        <td className="py-2">{r.type}</td>
                                        <td className="py-2">
                                            <span className={`px-2 rounded-full text-xs ${r.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                r.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="py-2">{r.details}</td>
                                        <td className="py-2 text-gray-400 text-xs">{r.createdAt.split('T')[0]}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
