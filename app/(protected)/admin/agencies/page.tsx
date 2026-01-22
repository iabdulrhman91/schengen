import { getSession } from "@/lib/actions";
import { storage } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui/core";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function AgenciesPage() {
    const session = await getSession();
    if (session?.role !== 'ADMIN') {
        return <div className="p-6">Unauthorized</div>;
    }

    const agencies = await storage.getAgencies();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">إدارة الوكالات (Hub Management)</h1>
                <Button className="flex items-center gap-2">
                    <Plus size={18} />
                    إضافة وكالة جديدة
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agencies.map(agency => (
                    <Card key={agency.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">{agency.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-gray-400 font-mono mb-4">ID: {agency.id}</div>
                            <div className="flex justify-between items-center pt-4 border-t">
                                <span className="text-xs text-gray-500">الحالة: نشط</span>
                                <Button variant="outline" size="sm">تعديل</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
