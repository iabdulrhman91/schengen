'use client';

import { useState } from 'react';
import { Agency } from '@/lib/storage/types';
import { createAgencyAction, updateAgencyAction, toggleAgencyStatusAction, deleteAgencyAction } from '@/lib/admin-actions';
import { useRouter } from 'next/navigation';
import { Check, Edit2, MoreHorizontal, Plus, Power, Trash2, X } from 'lucide-react';
import clsx from 'clsx';

export default function AgencyList({ agencies }: { agencies: Agency[] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const router = useRouter();

    const handleOpenCreate = () => {
        setEditingAgency(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (agency: Agency) => {
        setEditingAgency(agency);
        setIsModalOpen(true);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setEditingAgency(null);
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsProcessing(true);
        const formData = new FormData(e.currentTarget);

        try {
            if (editingAgency) {
                await updateAgencyAction(editingAgency.id, formData);
            } else {
                await createAgencyAction(formData);
            }
            handleClose();
        } catch (error) {
            alert('Operation failed');
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    }

    async function handleToggleStatus(id: string, currentStatus: boolean) {
        if (!confirm(currentStatus ? 'تعطيل الوكالة؟ سيتم منع الموظفين من الدخول.' : 'تفعيل الوكالة؟')) return;
        try {
            await toggleAgencyStatusAction(id, !currentStatus);
        } catch (e) { alert('Failed'); }
    }

    async function handleDelete(id: string) {
        if (!confirm('هل أنت متأكد من الحذف؟ لا يمكن التراجع بسهولة.')) return;
        try {
            await deleteAgencyAction(id);
        } catch (e) { alert('Failed'); }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إدارة الوكالات</h1>
                    <p className="text-gray-500 mt-1">عرض وإدارة الوكالات المشتركة في النظام</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus size={18} />
                    <span>إضافة وكالة</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-right">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">اسم الوكالة</th>
                            <th className="px-6 py-4">نوع الشراكة</th>
                            <th className="px-6 py-4">الرصيد</th>
                            <th className="px-6 py-4">الحالة</th>
                            <th className="px-6 py-4">تاريخ الانضمام</th>
                            <th className="px-6 py-4">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {agencies.map((agency) => (
                            <tr key={agency.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                            {agency.name.charAt(0)}
                                        </div>
                                        {agency.name}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={clsx(
                                        "px-2.5 py-1 rounded-full text-xs font-semibold",
                                        agency.type === 'OWNER' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                                    )}>
                                        {agency.type === 'OWNER' ? 'المالك' : 'شريك'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-gray-600">
                                    {agency.credit.toLocaleString()} SAR
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className={clsx("w-2 h-2 rounded-full", agency.isActive ? "bg-green-500" : "bg-red-500")}></div>
                                        <span className={clsx(agency.isActive ? "text-green-700" : "text-red-700")}>
                                            {agency.isActive ? 'نشط' : 'معطل'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-xs">
                                    {new Date(agency.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleOpenEdit(agency)}
                                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition" title="تعديل"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        {agency.type !== 'OWNER' && (
                                            <>
                                                <button
                                                    onClick={() => handleToggleStatus(agency.id, agency.isActive)}
                                                    className={clsx("p-1.5 rounded-md transition", agency.isActive ? "text-orange-500 hover:bg-orange-50" : "text-green-600 hover:bg-green-50")}
                                                    title={agency.isActive ? 'تعطيل' : 'تفعيل'}
                                                >
                                                    <Power size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(agency.id)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition" title="حذف"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {agencies.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                    لا توجد وكالات مسجلة
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <h3 className="font-bold text-lg text-gray-900">
                                    {editingAgency ? 'تعديل بيانات الوكالة' : 'تسجيل وكالة جديدة'}
                                </h3>
                                <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم الوكالة</label>
                                    <input
                                        name="name"
                                        type="text"
                                        defaultValue={editingAgency?.name}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        placeholder="مثال: وكالة الأفق للسفر"
                                    />
                                </div>

                                {!editingAgency && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">نوع الشراكة</label>
                                        <select
                                            name="type"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="PARTNER">شريك (Partner)</option>
                                            <option value="OWNER">مالك (Internal)</option>
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الرصيد الافتتاحي (SAR)</label>
                                    <input
                                        name="credit"
                                        type="number"
                                        defaultValue={editingAgency?.credit || 0}
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">يمكن تعديل الرصيد لاحقاً عبر العمليات المالية.</p>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isProcessing}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isProcessing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                        <span>{editingAgency ? 'حفظ التغييرات' : 'إنشاء الوكالة'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
