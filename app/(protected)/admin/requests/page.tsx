import { getSession, resolveAmendmentRequestAction } from "@/lib/actions";
import { storage } from "@/lib/storage";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/core";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export default async function AdminRequestsPage() {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'VISA_MANAGER')) {
        return <div className="p-6">Unauthorized</div>;
    }

    const requests = await storage.getAmendmentRequests();
    const pendingRequests = requests.filter(r => r.status === 'PENDING');
    const historyRequests = requests.filter(r => r.status !== 'PENDING');

    // Need to fetch cases for details? Or just show IDs?
    // Let's fetch cases to show File Number.
    const cases = await storage.getCases();
    const caseMap = new Map(cases.map(c => [c.id, c]));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">قائمة طلبات التعديل/الإلغاء</h1>
            </div>

            <Card>
                <CardHeader><CardTitle className="text-orange-700">طلبات قيد الانتظار ({pendingRequests.length})</CardTitle></CardHeader>
                <CardContent>
                    {pendingRequests.length === 0 ? <p className="text-gray-400">لا يوجد طلبات جديدة.</p> : (
                        <div className="space-y-4">
                            {pendingRequests.map(req => {
                                const c = caseMap.get(req.caseId);
                                return (
                                    <div key={req.id} className="border p-4 rounded bg-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 text-xs rounded font-bold ${req.type === 'CANCEL' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {req.type}
                                                </span>
                                                <span className="font-bold text-lg">{c?.fileNumber || req.caseId}</span>
                                            </div>
                                            <p className="text-gray-600 mt-1">{req.details}</p>
                                            <p className="text-xs text-gray-400 mt-1">من: {req.requestedBy} | {req.createdAt.split('T')[0]}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <form action={async () => {
                                                'use server';
                                                await resolveAmendmentRequestAction(req.id, 'APPROVED');
                                            }}>
                                                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs">
                                                    قبول ✅
                                                </Button>
                                            </form>
                                            <form action={async () => {
                                                'use server';
                                                await resolveAmendmentRequestAction(req.id, 'REJECTED', 'Rejected by Admin');
                                            }}>
                                                <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs">
                                                    رفض ❌
                                                </Button>
                                            </form>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>سجل الأرشيف</CardTitle></CardHeader>
                <CardContent>
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-gray-500 border-b">
                                <th className="text-right py-2">رقم الملف</th>
                                <th className="text-right py-2">النوع</th>
                                <th className="text-right py-2">الحالة</th>
                                <th className="text-right py-2">مراجعة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyRequests.map(req => (
                                <tr key={req.id} className="border-b">
                                    <td className="py-2">{caseMap.get(req.caseId)?.fileNumber}</td>
                                    <td className="py-2">{req.type}</td>
                                    <td className="py-2">
                                        <span className={req.status === 'APPROVED' ? 'text-green-600' : 'text-red-600'}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="py-2">{req.reviewedBy}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
