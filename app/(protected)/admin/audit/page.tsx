export default function AuditLogsPage() {
    return (
        <div className="max-w-6xl mx-auto py-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">سجل العمليات (Audit Logs)</h1>
                    <p className="text-gray-500 mt-1">تتبع كافة الإجراءات الحساسة في النظام</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700">تصدير</button>
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700">تصفية</button>
                </div>
            </div>

            {/* Table Skeleton */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-5 bg-gray-50 p-4 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-1">المستخدم</div>
                    <div className="col-span-1">الحدث (Action)</div>
                    <div className="col-span-2">التفاصيل</div>
                    <div className="col-span-1 text-left">التاريخ</div>
                </div>

                {[1, 2, 3, 4, 5].map((_, i) => (
                    <div key={i} className="grid grid-cols-5 p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <div className="col-span-1 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200"></div>
                            <div className="h-4 w-24 bg-gray-100 rounded"></div>
                        </div>
                        <div className="col-span-1">
                            <div className="h-4 w-32 bg-gray-100 rounded"></div>
                        </div>
                        <div className="col-span-2">
                            <div className="h-4 w-full bg-gray-100 rounded"></div>
                        </div>
                        <div className="col-span-1">
                            <div className="h-4 w-20 bg-gray-100 rounded ml-auto"></div>
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-center text-sm text-gray-400 mt-4">
                عرض هيكلي للبيانات
            </p>
        </div>
    );
}
