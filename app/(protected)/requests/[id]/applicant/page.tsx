import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/core";
import MainApplicantForm from "./form";

export default function ApplicantPage({ params }: { params: { id: string } }) {
    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">بيانات الطلب - الخطوة 2</h1>
                <Link href="/requests">
                    <Button variant="outline">حفظ كمسودة وخروج</Button>
                </Link>
            </div>

            <div className="flex justify-between mb-8">
                <div className="flex-1 text-center border-b-2 border-green-500 pb-2 text-green-600">1. بيانات الطلب ✓</div>
                <div className="flex-1 text-center border-b-2 border-blue-600 pb-2 font-bold text-blue-600">2. المتقدم الأساسي</div>
                <div className="flex-1 text-center border-b-2 border-gray-200 pb-2 text-gray-400">3. التاطعين</div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>بيانات المتقدم الأساسي</CardTitle>
                </CardHeader>
                <CardContent>
                    <MainApplicantForm caseId={params.id} />
                </CardContent>
            </Card>
        </div>
    );
}
