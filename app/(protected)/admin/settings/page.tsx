export default function AdminSettingsPage() {
    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">إعدادات النظام</h1>
                <p className="text-gray-500 mt-1">التحكم في المتغيرات الأساسية للنظام</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8 opacity-70 cursor-not-allowed">
                {/* Structural Placeholder: Maintenance Mode */}
                <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                    <div>
                        <h3 className="font-medium text-gray-900">وضع الصيانة</h3>
                        <p className="text-sm text-gray-500">منع الوصول للنظام مؤقتاً لجميع المستخدمين</p>
                    </div>
                    <div className="w-11 h-6 bg-gray-200 rounded-full relative">
                        <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm"></div>
                    </div>
                </div>

                {/* Structural Placeholder: Registration */}
                <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                    <div>
                        <h3 className="font-medium text-gray-900">تسجيل الوكالات</h3>
                        <p className="text-sm text-gray-500">السماح للوكالات الجديدة بالتسجيل الذاتي</p>
                    </div>
                    <div className="w-11 h-6 bg-blue-600 rounded-full relative">
                        <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                    </div>
                </div>

                {/* Structural Placeholder: Currency */}
                <div>
                    <h3 className="font-medium text-gray-900 mb-2">العملة الافتراضية</h3>
                    <div className="h-10 w-48 bg-gray-100 rounded-lg border border-gray-200"></div>
                </div>
            </div>

            <p className="text-center text-sm text-gray-400 mt-4">
                هذه الصفحة هيكلية فقط ولم يتم تفعيلها بعد
            </p>
        </div>
    );
}
