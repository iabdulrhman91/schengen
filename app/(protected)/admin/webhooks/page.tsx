import { getSession } from "@/lib/actions";
import { storage } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/core";
import { Button } from "@/components/ui/core";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ResendButton } from "./resend-button";

export default async function WebhookLogsPage({ searchParams }: { searchParams: { status?: string } }) {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'VISA_MANAGER')) {
        return <div className="p-6">Unauthorized</div>;
    }

    const statusFilter = searchParams.status;
    const logs = await storage.getWebhookLogs(statusFilter ? { status: statusFilter } : undefined);

    // Recent first
    const sortedLogs = logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">سجل التنبيهات (Webhooks)</h1>
                <div className="flex gap-2">
                    <Link href="/admin/webhooks">
                        <Button variant={!statusFilter ? "default" : "outline"} size="sm">الكل</Button>
                    </Link>
                    <Link href="/admin/webhooks?status=PENDING">
                        <Button variant={statusFilter === 'PENDING' ? "default" : "outline"} size="sm">انتظار</Button>
                    </Link>
                    <Link href="/admin/webhooks?status=SENT">
                        <Button variant={statusFilter === 'SENT' ? "default" : "outline"} size="sm" className={statusFilter === 'SENT' ? "bg-green-600" : ""}>تم الإرسال</Button>
                    </Link>
                    <Link href="/admin/webhooks?status=FAILED">
                        <Button variant={statusFilter === 'FAILED' ? "default" : "outline"} size="sm" className={statusFilter === 'FAILED' ? "bg-red-600" : ""}>فشل</Button>
                    </Link>
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle>آخر الأحداث المسجلة ({sortedLogs.length})</CardTitle></CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b text-gray-500">
                                    <th className="text-right py-2 px-2">ID / Event</th>
                                    <th className="text-right py-2 px-2">الحالة</th>
                                    <th className="text-right py-2 px-2">إنشاء / معالجة</th>
                                    <th className="text-right py-2 px-2">التفاصيل (Payload / Error)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedLogs.map(log => (
                                    <tr key={log.id} className="border-b hover:bg-gray-50">
                                        <td className="py-2 px-2">
                                            <div className="font-mono text-xs font-bold text-blue-600">{log.event}</div>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono bg-gray-100 rounded px-1 w-fit mt-1" title="Event ID">
                                                {log.eventId || '---'}
                                            </div>
                                        </td>
                                        <td className="py-2 px-2">
                                            <span className={`px-2 py-0.5 rounded text-xs inline-block text-center min-w-[60px] ${log.status === 'SENT' ? 'bg-green-100 text-green-800' :
                                                log.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="py-2 px-2 dir-ltr text-right text-xs">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="text-gray-600">{new Date(log.createdAt).toLocaleTimeString('en-GB')}</div>
                                                {log.processedAt && <div className="text-green-600 text-[10px]">✔ {new Date(log.processedAt).toLocaleTimeString('en-GB')}</div>}
                                                <ResendButton logId={log.id} />
                                            </div>
                                        </td>
                                        <td className="py-2 px-2 max-w-md truncate text-xs">
                                            <div className="text-gray-500 font-mono" title={log.payload}>{log.payload}</div>
                                            {log.errorMessage && <div className="text-red-500 mt-1" title={log.errorMessage}>Error: {log.errorMessage}</div>}
                                        </td>
                                    </tr>
                                ))}
                                {sortedLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-gray-400">لا توجد سجلات مطابقة.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
