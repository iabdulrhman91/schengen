
import Link from "next/link";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/core";
import { storage } from "@/lib/storage";
import { addDependentAction, submitWizardAction } from "@/lib/actions";

export default async function DependentsPage({ params }: { params: { id: string } }) {
    const myCase = await storage.getCase(params.id);
    // Filter for DEPENDENT type. 
    const dependents = myCase?.applicants?.filter((a: any) => a.type === 'DEPENDENT') || [];

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">بيانات الطلب - الخطوة 3</h1>
                <Link href="/requests">
                    <Button variant="outline">حفظ كمسودة وخروج</Button>
                </Link>
            </div>

            <div className="flex justify-between mb-8">
                <div className="flex-1 text-center border-b-2 border-green-500 pb-2 text-green-600">1. بيانات الطلب ✓</div>
                <div className="flex-1 text-center border-b-2 border-green-500 pb-2 text-green-600">2. المتقدم الأساسي ✓</div>
                <div className="flex-1 text-center border-b-2 border-blue-600 pb-2 font-bold text-blue-600">3. التابعين (المرافقين)</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Add Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>إضافة تابع جديد</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={addDependentAction} className="space-y-4">
                            <input type="hidden" name="caseId" value={params.id} />
                            <div className="space-y-2">
                                <Label>الاسم (مطابق للجواز)</Label>
                                <Input name="nameInPassport" required className="text-right" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>رقم الجواز</Label>
                                    <Input name="passportNumber" required className="text-right" />
                                </div>
                                <div className="space-y-2">
                                    <Label>الجنسية</Label>
                                    <Input name="nationality" required className="text-right" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>تاريخ الميلاد</Label>
                                    <Input name="birthDate" type="date" required className="text-right" />
                                </div>
                                <div className="space-y-2">
                                    <Label>تاريخ انتهاء الجواز</Label>
                                    <Input name="passportExpiryDate" type="date" required className="text-right" />
                                </div>
                            </div>
                            {/* Simplified fields for dependent per user request? 
                        User said "Step 3: Dependents (Multiple)". Assuming same fields as Applicant but maybe less?
                        I'll include basic ones.
                    */}
                            <div className="space-y-2">
                                <Label>الجنس</Label>
                                <select name="gender" className="w-full h-10 border rounded px-3 bg-white" required>
                                    <option value="MALE">ذكر</option>
                                    <option value="FEMALE">أنثى</option>
                                </select>
                            </div>

                            <Button type="submit" className="w-full mt-2" variant="outline">
                                + إضافة التابع
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* List */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>قائمة التابعين المضافين ({dependents.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {dependents.length === 0 ? (
                                <p className="text-gray-500">لا يوجد تابعين مضافين حالياً.</p>
                            ) : (
                                <div className="space-y-4">
                                    {dependents.map((dep: any) => (
                                        <div key={dep.id} className="p-3 border rounded bg-gray-50 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold">{dep.nameInPassport}</p>
                                                <p className="text-sm text-gray-500">{dep.nationality} - {dep.passportNumber}</p>
                                            </div>
                                            <div className="text-xs text-gray-400">تابع</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="space-y-4 pt-4 border-t">
                        <form action={submitWizardAction.bind(null, params.id)}>
                            <Button type="submit" className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 text-white">
                                ✓ إرسال الطلب واعتماد الموعد
                            </Button>
                            <p className="text-xs text-center text-gray-500 mt-2">
                                سيتم التحقق من سعة الموعد تلقائياً وحجز المقاعد.
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
