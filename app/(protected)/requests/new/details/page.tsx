
import { getSession } from "@/lib/actions";
import { createCaseDraft } from "@/lib/actions";
import { Button, Card, CardContent, CardHeader, CardTitle, Label, Input } from "@/components/ui/core";
import { ArrowRight } from "lucide-react";

export default async function CreateCaseDetailsPage({ searchParams }: { searchParams: { apt: string, type: string } }) {
    const session = await getSession();
    const aptId = searchParams.apt;
    const seatType = searchParams.type || 'NORMAL';

    if (!aptId) {
        return <div className="p-8 text-center text-red-500">Error: No appointment selected.</div>;
    }

    return (
        <div className="max-w-xl mx-auto py-10">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">بيانات التذكرة المرجعية</h1>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">استكمال بيانات الطلب</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={createCaseDraft} className="space-y-6">
                        <input type="hidden" name="appointmentId" value={aptId} />
                        <input type="hidden" name="seatType" value={seatType} />

                        <div className="space-y-2">
                            <Label htmlFor="fileNumber">رقم الملف (File Number)</Label>
                            <Input id="fileNumber" name="fileNumber" required placeholder="مثال: F-2025-001" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="travelDate">تاريخ السفر</Label>
                                <Input id="travelDate" name="travelDate" type="date" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="returnDate">تاريخ العودة</Label>
                                <Input id="returnDate" name="returnDate" type="date" required />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-between items-center bg-gray-50 -mx-6 -mb-6 p-6 border-t mt-4">
                            <div className="text-sm text-gray-500">
                                درجة الحجز: <span className="font-bold text-gray-800">{seatType}</span>
                            </div>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]">
                                إنشاء الطلب
                                <ArrowRight className="mr-2 w-4 h-4 rotate-180" />
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
