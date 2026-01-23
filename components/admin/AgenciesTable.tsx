"use client";

import { useState } from "react";
import { Agency } from "@/lib/storage/types";
// Corrected imports to use toggleAgencyStatusAction
import { createAgencyAction, updateAgencyAction, toggleAgencyStatusAction } from "@/lib/admin-actions";
import { Plus, Search, Edit, XCircle, Power } from "lucide-react";

export function AgenciesTable({ agencies }: { agencies: Agency[] }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Filter
    const filtered = agencies.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            if (editingAgency) {
                // Update
                const res = await updateAgencyAction(editingAgency.id, formData);
                if (res.success) {
                    setIsDialogOpen(false);
                    setEditingAgency(null);
                } else {
                    alert("فشل التحديث");
                }
            } else {
                // Create
                const res = await createAgencyAction(formData);
                if (res.success) {
                    setIsDialogOpen(false);
                } else {
                    alert("فشل الإنشاء");
                }
            }
        } catch (err) {
            console.error(err);
            alert("حدث خطأ");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleToggleStatus(id: string, currentStatus: boolean) {
        if (!confirm(currentStatus ? "هل أنت متأكد من تعطيل هذه الوكالة؟" : "هل أنت متأكد من تفعيل هذه الوكالة؟")) return;

        setIsLoading(true);
        try {
            await toggleAgencyStatusAction(id, !currentStatus);
        } catch (err) {
            console.error(err);
            alert("فشل تغيير الحالة");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header / Actions */}
            <div className="flex justify-between items-center mb-6">
                <div className="relative">
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="بحث عن وكالة..."
                        className="pr-10 pl-4 py-2 border rounded-md w-64 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => { setEditingAgency(null); setIsDialogOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                    <Plus size={16} />
                    إضافة وكالة
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                    <thead className="bg-gray-50 text-gray-700 font-medium">
                        <tr>
                            <th className="px-4 py-3">الاسم</th>
                            <th className="px-4 py-3">المعرف</th>
                            <th className="px-4 py-3">النوع</th>
                            <th className="px-4 py-3">الرصيد</th>
                            <th className="px-4 py-3">الحالة</th>
                            <th className="px-4 py-3">تاريخ الإنشاء</th>
                            <th className="px-4 py-3 text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map((agency) => (
                            <tr key={agency.id} className="hover:bg-gray-50 group">
                                <td className="px-4 py-3 font-medium text-gray-900">{agency.name}</td>
                                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{agency.id}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${agency.type === 'OWNER' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {agency.type === 'OWNER' ? 'مالك' : 'شريك'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 font-semibold text-green-600">{agency.credit?.toLocaleString()} SAR</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${agency.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {agency.isActive ? 'نشط' : 'معطل'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs">
                                    {new Date(agency.createdAt || "").toLocaleDateString('en-GB')}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2 text-gray-400 group-hover:text-gray-600">
                                        <button
                                            onClick={() => { setEditingAgency(agency); setIsDialogOpen(true); }}
                                            className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="تعديل"
                                        >
                                            <Edit size={16} />
                                        </button>

                                        {agency.id !== 'tejwal' && (
                                            <button
                                                onClick={() => handleToggleStatus(agency.id, agency.isActive)}
                                                className={`p-1 rounded ${agency.isActive ? 'hover:text-red-600 hover:bg-red-50' : 'hover:text-green-600 hover:bg-green-50'}`}
                                                title={agency.isActive ? "تعطيل" : "تفعيل"}
                                            >
                                                <Power size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Dialog / Modal */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setIsDialogOpen(false)}
                            className="absolute left-4 top-4 text-gray-400 hover:text-gray-600"
                        >
                            <XCircle size={20} />
                        </button>

                        <h2 className="text-xl font-bold mb-4 text-gray-900">
                            {editingAgency ? `تعديل: ${editingAgency.name}` : "إضافة وكالة جديدة"}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* No ID hidden input needed for update action as we pass it directly */}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الوكالة</label>
                                <input
                                    name="name"
                                    required
                                    defaultValue={editingAgency?.name}
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="مثال: وكالة الأفق للسفر"
                                />
                            </div>

                            {!editingAgency && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">نوع الوكالة</label>
                                    <select
                                        name="type"
                                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="PARTNER">شريك (Partner)</option>
                                        <option value="OWNER">مالك (Owner)</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {editingAgency ? "تعديل الرصيد (SAR)" : "الرصيد الافتتاحي (SAR)"}
                                </label>
                                <input
                                    name="credit"
                                    type="number"
                                    min="0"
                                    defaultValue={editingAgency?.credit || 0}
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-4 border-t mt-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
                                >
                                    {isLoading ? "جاري الحفظ..." : "حفظ"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsDialogOpen(false)}
                                    disabled={isLoading}
                                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200 font-medium"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
