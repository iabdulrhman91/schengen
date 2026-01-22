
import { useState, useRef } from 'react';
import { cn } from "@/components/ui/core";
import { Button, Input, Card, CardHeader, CardContent } from '@/components/ui/core';
import { Loader2, Camera, Upload, CheckCircle2, User, FileText, Calendar, MapPin, X, AlertCircle, Edit2, ShieldAlert } from 'lucide-react';
import { validatePassportData, ParsedPassportData, normalizeAIDate } from '@/lib/ocr-helper';
import { extractPassportAction } from '@/lib/ai-vision-actions';
import { arSA } from 'date-fns/locale';
import { CustomDatePicker } from '@/components/ui/date-picker';

export interface PassengerData {
    id: string;
    type: 'ADULT' | 'CHILD' | 'INFANT';
    fullName: string;
    passportNumber: string;
    idNumber: string; // Added ID Number
    nationality: string;
    sex: string;
    birthDate: string;
    issueDate: string;
    expiryDate: string;
    placeOfBirth: string;
    maritalStatus?: string;
    scanLog?: {
        rawText?: string;
        json?: any;
        uncertainFields?: string[];
    };
    appointmentDate?: string; // Added to help calculate age accurately
}

interface PassengerFormProps {
    passengerType: 'ADULT' | 'CHILD' | 'INFANT';
    index: number;
    data: PassengerData;
    onChange: (data: PassengerData) => void;
    onSuccess?: () => void;
}

export function PassengerForm({ passengerType, index, data, onChange, onSuccess }: PassengerFormProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'WARNING'>('IDLE');
    const [uncertainFields, setUncertainFields] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setScanError(null);
        setStatus('IDLE');

        try {
            // 1. Convert to Base64 for Gemini
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            // 2. AI Vision extraction (Sole Source)
            const aiResult = await extractPassportAction(base64);

            if (!aiResult) {
                throw new Error("لم يتمكن النظام من قراءة الصورة");
            }

            const results: Partial<ParsedPassportData> = {
                fullName: aiResult.fullNameLatin || aiResult.fullName,
                passportNumber: aiResult.passportNumber,
                nationality: aiResult.nationality,
                sex: aiResult.sex,
                birthDate: normalizeAIDate(aiResult.dateOfBirth || aiResult.birthDate),
                issueDate: normalizeAIDate(aiResult.dateOfIssue || aiResult.issueDate),
                expiryDate: normalizeAIDate(aiResult.dateOfExpiry || aiResult.expiryDate),
                placeOfBirth: aiResult.placeOfBirth,
                confidence: aiResult.confidence,
                rawText: aiResult.rawText
            };

            // 3. Apply Guardrails
            const validation = validatePassportData(results);
            setUncertainFields(validation.uncertainFields);

            onChange({
                ...data,
                fullName: results.fullName || data.fullName,
                passportNumber: results.passportNumber || data.passportNumber,
                nationality: results.nationality || data.nationality,
                sex: results.sex || data.sex,
                birthDate: results.birthDate || data.birthDate,
                issueDate: results.issueDate || data.issueDate,
                expiryDate: results.expiryDate || data.expiryDate,
                placeOfBirth: results.placeOfBirth || data.placeOfBirth,
                scanLog: {
                    rawText: results.rawText,
                    json: aiResult,
                    uncertainFields: validation.uncertainFields
                }
            });

            if (validation.isHighConfidence && validation.isValid) {
                setStatus('SUCCESS');
                if (onSuccess) onSuccess();
            } else {
                setStatus('WARNING');
            }
        } catch (error: any) {
            console.error("AI Extraction Error:", error);
            setScanError(error.message || "فشل في استخراج البيانات بواسطة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى أو الإدخال يدوياً.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleChange = (field: keyof PassengerData, value: string) => {
        onChange({ ...data, [field]: value });
    };

    // Age Validation Logic
    const calculateAge = (birthDate: string, refDate?: string) => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const ref = refDate ? new Date(refDate) : new Date();
        let age = ref.getFullYear() - birth.getFullYear();
        const m = ref.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
        return age;
    };

    const getCorrectCategory = (age: number): 'ADULT' | 'CHILD' | 'INFANT' => {
        if (age < 2) return 'INFANT';
        if (age < 12) return 'CHILD';
        return 'ADULT';
    };

    const getAgeEmoji = (age: number | null) => {
        if (age === null) return null;
        if (age < 2) return { emoji: "🍼", label: "رضيع", color: "text-orange-600", bg: "bg-orange-50" };
        if (age < 12) return { emoji: "🧸", label: "طفل", color: "text-green-600", bg: "bg-green-50" };
        return { emoji: "👤", label: "بالغ", color: "text-gray-400", bg: "bg-gray-50" };
    };

    const age = calculateAge(data.birthDate, data.appointmentDate);
    const correctCategory = age !== null ? getCorrectCategory(age) : null;
    const isCategoryMismatch = correctCategory && correctCategory !== passengerType;

    const getTypeLabel = () => {
        switch (passengerType) {
            case 'ADULT': return 'بالغ';
            case 'CHILD': return 'طفل';
            case 'INFANT': return 'رضيع';
            default: return 'مسافر';
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Action Bar (Scan & Status) */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <Camera className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-800">استكمال البيانات آلياً</h4>
                        <p className="text-[11px] text-gray-500">قم بتصوير صفحة بيانات الجواز للاستخراج السريع</p>
                    </div>
                </div>

                <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                    className="w-full sm:w-auto flex items-center gap-2 bg-white border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm"
                >
                    {isScanning ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            جاري المسح...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4" />
                            مسح الجواز بالذكاء الاصطناعي
                        </>
                    )}
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />
            </div>

            {/* Status Messages */}
            {status === 'SUCCESS' && (
                <div className="bg-green-50 text-green-700 text-sm px-4 py-3 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-2 font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>تم استخراج بيانات الجواز بنجاح.</span>
                    </div>
                </div>
            )}
            {status === 'WARNING' && (
                <div className="bg-amber-50 text-amber-800 text-sm px-4 py-3 flex items-center justify-between animate-in fade-in slide-in-from-top-1 border-y border-amber-100">
                    <div className="flex items-center gap-2 font-bold">
                        <ShieldAlert className="w-5 h-5" />
                        <span>تم استخراج البيانات بذكاء اصطناعي، يرجى مراجعة الحقول الملونة.</span>
                    </div>
                </div>
            )}
            {scanError && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-2 flex items-center gap-2">
                    <X className="w-4 h-4" />
                    {scanError}
                </div>
            )}

            {/* Form Fields - Grid Layout */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-gray-500">الاسم الكامل (مطابق للجواز)</label>
                    <div className="relative">
                        <User className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={data.fullName}
                            onChange={(e) => handleChange('fullName', e.target.value)}
                            className="w-full pr-10 pl-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                            placeholder="الاسم الأول + اسم العائلة"
                        />
                    </div>
                </div>

                {/* Passport Number */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-500">رقم الجواز</label>
                        {uncertainFields.includes('passportNumber') && (
                            <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                يحتاج تأكيد
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <FileText className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={data.passportNumber}
                            onChange={(e) => handleChange('passportNumber', e.target.value.toUpperCase())}
                            className={`w-full pr-10 pl-3 py-2.5 rounded-lg border transition-all font-mono uppercase ${uncertainFields.includes('passportNumber') ? 'border-red-300 bg-red-50/10' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'}`}
                            placeholder="A12345678"
                        />
                    </div>
                </div>

                {/* ID Number */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">رقم الهوية / الإقامة</label>
                    <div className="relative">
                        <User className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={data.idNumber || ''}
                            onChange={(e) => handleChange('idNumber', e.target.value)}
                            className="w-full pr-10 pl-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                            placeholder="1XXXXXXXXX"
                        />
                    </div>
                </div>

                {/* Nationality */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">الجنسية</label>
                    <div className="relative">
                        <MapPin className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={data.nationality}
                            onChange={(e) => handleChange('nationality', e.target.value)}
                            className="w-full pr-10 pl-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="SAU"
                        />
                    </div>
                </div>

                {/* Birth Date */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-gray-500">تاريخ الميلاد</label>
                            {age !== null && (
                                <span
                                    className={cn(
                                        "flex items-center justify-center w-5 h-5 rounded-full text-[11px] cursor-help transition-transform hover:scale-110",
                                        getAgeEmoji(age)?.bg
                                    )}
                                    title={`${age} سنة (${getAgeEmoji(age)?.label})`}
                                >
                                    {getAgeEmoji(age)?.emoji}
                                </span>
                            )}
                        </div>
                        {uncertainFields.includes('birthDate') && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                يحتاج تأكيد
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <CustomDatePicker
                            value={data.birthDate ? new Date(data.birthDate) : undefined}
                            onChange={(date) => handleChange('birthDate', date ? date.toISOString().split('T')[0] : "")}
                            className={`w-full justify-start text-right font-normal ${isCategoryMismatch ? 'border-red-500 bg-red-50' : uncertainFields.includes('birthDate') ? 'border-amber-300 bg-amber-50/30' : 'border-gray-300'}`}
                            placeholder="اختر تاريخ الميلاد..."
                        />
                        {isCategoryMismatch && (
                            <div className="mt-2 p-3 bg-red-100 border border-red-200 rounded-lg flex items-start gap-2 animate-in slide-in-from-top-2">
                                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                                <div className="text-[11px] text-red-800 leading-relaxed font-bold">
                                    هناك تعارض في الفئة! عمر المسافر ({age} سنة) يجعله في فئة [{correctCategory === 'ADULT' ? 'بالغ' : correctCategory === 'CHILD' ? 'طفل' : 'رضيع'}]، بينما الموعد المختار هو [{getTypeLabel()}].
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sex */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">الجنس</label>
                    <select
                        value={data.sex}
                        onChange={(e) => handleChange('sex', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="">اختر...</option>
                        <option value="M">ذكر (M)</option>
                        <option value="F">أنثى (F)</option>
                    </select>
                </div>

                {/* Marital Status - ONLY for ADULTs */}
                {passengerType === 'ADULT' && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-300">
                        <label className="text-xs font-bold text-gray-500">الحالة الاجتماعية</label>
                        <select
                            value={data.maritalStatus || ''}
                            onChange={(e) => handleChange('maritalStatus' as any, e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                        >
                            <option value="">اختر...</option>
                            <option value="SINGLE">أعزب / عزباء</option>
                            <option value="MARRIED">متزوج / ـة</option>
                        </select>
                    </div>
                )}

                {/* Place of Birth */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">مكان الميلاد</label>
                    <div className="relative">
                        <MapPin className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={data.placeOfBirth}
                            onChange={(e) => handleChange('placeOfBirth', e.target.value)}
                            className="w-full pr-10 pl-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                            placeholder="المدينة، الدولة"
                        />
                    </div>
                </div>

                {/* Issue Date */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-500">تاريخ الإصدار</label>
                        {uncertainFields.includes('issueDate') && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-bold">يحتاج تأكيد</span>
                        )}
                    </div>
                    <CustomDatePicker
                        value={data.issueDate ? new Date(data.issueDate) : undefined}
                        onChange={(date) => handleChange('issueDate', date ? date.toISOString().split('T')[0] : "")}
                        className={`w-full justify-start text-right font-normal ${uncertainFields.includes('issueDate') ? 'border-amber-300 bg-amber-50/30' : 'border-gray-300'}`}
                        placeholder="اختر تاريخ الإصدار..."
                    />
                </div>

                {/* Expiry Date */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-500">تاريخ الانتهاء</label>
                        {uncertainFields.includes('expiryDate') && (
                            <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-bold">يحتاج تأكيد</span>
                        )}
                    </div>
                    <CustomDatePicker
                        value={data.expiryDate ? new Date(data.expiryDate) : undefined}
                        onChange={(date) => handleChange('expiryDate', date ? date.toISOString().split('T')[0] : "")}
                        className={`w-full justify-start text-right font-normal ${uncertainFields.includes('expiryDate') ? 'border-red-300 bg-red-50/30' : 'border-gray-300'}`}
                        placeholder="اختر تاريخ الانتهاء..."
                    />
                </div>
            </div>
        </div>
    );
}
