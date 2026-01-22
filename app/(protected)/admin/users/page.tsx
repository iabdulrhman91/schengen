import { getSession } from "@/lib/actions";
import { storage } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui/core";
import { Plus, ShieldCheck, User as UserIcon } from "lucide-react";

export default async function UsersPage() {
    const session = await getSession();
    if (session?.role !== 'ADMIN') {
        return <div className="p-6">Unauthorized</div>;
    }

    const users = await storage.getUsers();
    const agencies = await storage.getAgencies();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">إدارة المستخدمين والصلاحيات</h1>
                <Button className="flex items-center gap-2">
                    <Plus size={18} />
                    إنشاء مستخدم جديد
                </Button>
            </div>

            <Card>
                <CardHeader><CardTitle>قائمة المستخدمين في النظام</CardTitle></CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr className="text-gray-500 text-sm">
                                    <th className="text-right py-3 px-4">المستخدم</th>
                                    <th className="text-right py-3 px-4">الدور</th>
                                    <th className="text-right py-3 px-4">الوكالة</th>
                                    <th className="text-right py-3 px-4">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {users.map(user => {
                                    const agency = agencies.find(a => a.id === user.agencyId);
                                    const isMaster = user.agencyId === 'tejwal';
                                    return (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isMaster ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        <UserIcon size={14} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">{user.name}</div>
                                                        <div className="text-xs text-gray-400">@{user.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                                                        user.role === 'VISA_MANAGER' ? 'bg-red-100 text-red-700' :
                                                            'bg-green-100 text-green-700'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-1">
                                                    {isMaster && <ShieldCheck size={12} className="text-blue-600" />}
                                                    <span className={isMaster ? "text-blue-800 font-medium" : "text-gray-600"}>
                                                        {agency?.name || 'بدون وكالة'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Button variant="ghost" size="sm">تعديل</Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
