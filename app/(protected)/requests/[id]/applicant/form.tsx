'use client';

import { saveMainApplicantAction } from "@/lib/actions";
import { Button, Input, Label, Card, CardContent } from "@/components/ui/core";
import { CustomDatePicker } from "@/components/ui/date-picker";
import { useState } from "react";

export default function MainApplicantForm({ caseId }: { caseId: string }) {
    const [isEmployee, setIsEmployee] = useState(false);
    const [birthDate, setBirthDate] = useState("");
    const [issueDate, setIssueDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");

    const calculateAge = (bDate: string) => {
        if (!bDate) return 18; // Default to adult age to show field initially
        const birth = new Date(bDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const age = calculateAge(birthDate);
    const showMaritalStatus = age >= 18;

    return (
        <form action={saveMainApplicantAction.bind(null, caseId)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>الاسم (مطابق للجواز)</Label>
                    <Input name="nameInPassport" required className="text-right" placeholder="Name inside passport" />
                </div>
                <div className="space-y-2">
                    <Label>رقم الجواز</Label>
                    <Input name="passportNumber" required className="text-right" />
                </div>
            </div>

            <div className="space-y-2">
                <Label>رابط صورة الجواز (مؤقتاً)</Label>
                <Input name="passportImage" placeholder="http://..." className="text-right" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>رقم الجوال</Label>
                    <Input name="mobileNumber" className="text-right" />
                </div>
                <div className="space-y-2">
                    <Label>تاريخ الميلاد</Label>
                    <CustomDatePicker
                        value={birthDate ? new Date(birthDate) : undefined}
                        onChange={(date) => {
                            const dateStr = date ? date.toISOString().split('T')[0] : "";
                            setBirthDate(dateStr);
                        }}
                        name="birthDate"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>تاريخ إصدار الجواز</Label>
                    <CustomDatePicker
                        value={issueDate ? new Date(issueDate) : undefined}
                        onChange={(date) => setIssueDate(date ? date.toISOString().split('T')[0] : "")}
                        name="passportIssueDate"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label>تاريخ انتهاء الجواز</Label>
                    <CustomDatePicker
                        value={expiryDate ? new Date(expiryDate) : undefined}
                        onChange={(date) => setExpiryDate(date ? date.toISOString().split('T')[0] : "")}
                        name="passportExpiryDate"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>الجنسية</Label>
                    <Input name="nationality" required className="text-right" />
                </div>
                <div className="space-y-2">
                    <Label>رقم الهوية</Label>
                    <Input name="nationalId" className="text-right" />
                </div>
            </div>

            <div className="space-y-2">
                <Label>مكان الميلاد (بالإنجليزي)</Label>
                <Input name="placeOfBirthEn" required className="text-left" placeholder="Place of Birth" dir="ltr" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>الجنس</Label>
                    <select name="gender" className="w-full h-10 border rounded px-3 bg-white" required>
                        <option value="MALE">ذكر</option>
                        <option value="FEMALE">أنثى</option>
                    </select>
                </div>
                {showMaritalStatus && (
                    <div className="space-y-2">
                        <Label>الحالة الاجتماعية</Label>
                        <select name="maritalStatus" className="w-full h-10 border rounded px-3 bg-white" required>
                            <option value="SINGLE">أعزب/عزباء</option>
                            <option value="MARRIED">متزوج/ـة</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 pt-2">
                <input
                    type="checkbox"
                    id="isEmployee"
                    name="isEmployee"
                    className="w-4 h-4"
                    onChange={(e) => setIsEmployee(e.target.checked)}
                />
                <Label htmlFor="isEmployee">هل هو موظف؟</Label>
            </div>

            {isEmployee && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded border">
                    <div className="space-y-2">
                        <Label>جهة العمل (بالإنجليزي)</Label>
                        <Input name="employerEn" required className="text-left" dir="ltr" />
                    </div>
                    <div className="space-y-2">
                        <Label>المسمى الوظيفي (بالإنجليزي)</Label>
                        <Input name="jobTitleEn" required className="text-left" dir="ltr" />
                    </div>
                </div>
            )}

            <div className="pt-4">
                <Button type="submit" className="w-full">
                    حفظ والانتقال للخطوة التالية (التابعين)
                </Button>
            </div>
        </form>
    );
}
