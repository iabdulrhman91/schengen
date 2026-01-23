'use client';

import { useState } from 'react';
import { User, Agency, Role } from '@/lib/storage/types';
import { createUserAction, updateUserAction, toggleUserStatusAction, deleteUserAction } from '@/lib/admin-user-actions';
import { Check, Edit2, Plus, Power, Trash2, X, User as UserIcon } from 'lucide-react';
import clsx from 'clsx';

export default function UserList({ users, agencies }: { users: User[], agencies: Agency[] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role>('AGENCY_USER');

    const handleOpenCreate = () => {
        setEditingUser(null);
        setSelectedRole('AGENCY_USER');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (user: User) => {
        setEditingUser(user);
        setSelectedRole(user.role);
        setIsModalOpen(true);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsProcessing(true);
        const formData = new FormData(e.currentTarget);

        try {
            if (editingUser) {
                await updateUserAction(editingUser.id, formData);
            } else {
                await createUserAction(formData);
            }
            handleClose();
        } catch (error) {
            alert('Operation failed or Username taken');
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    }

    async function handleToggleStatus(id: string, currentStatus: boolean) {
        if (!confirm(currentStatus ? 'تعطيل الحساب؟' : 'تفعيل الحساب؟')) return;
        try {
            await toggleUserStatusAction(id, !currentStatus);
        } catch (e) { alert('Failed'); }
    }

    async function handleDelete(id: string) {
        if (!confirm('هل أنت متأكد من الحذف النهائي؟')) return;
        try {
            await deleteUserAction(id);
        } catch (e) { alert('Failed'); }
    }

    const availableRoles: { value: Role; label: string }[] = [
        { value: 'MASTER_ADMIN', label: 'مدير النظام (المالك)' },
        { value: 'AGENCY_MANAGER', label: 'مدير وكالة' },
        { value: 'AGENCY_USER', label: 'موظف وكالة' },
        { value: 'ADMIN', label: 'مدير إداري (قديم)' },
        { value: 'VISA_MANAGER', label: 'مدير تأشيرات (قديم)' },
        { value: 'EMPLOYEE', label: 'موظف عمليات (قديم)' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
                    <p className="text-gray-500 mt-1">إضافة وتعديل صلاحيات المستخدمين والمسؤولين</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus size={18} />
                    <span>إضافة مستخدم</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-right">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">الاسم / اسم المستخدم</th>
                            <th className="px-6 py-4">الدور (الصلاحية)</th>
                            <th className="px-6 py-4">الوكالة التابعة</th>
                            <th className="px-6 py-4">الحالة</th>
                            <th className="px-6 py-4">تاريخ التسجيل</th>
                            <th className="px-6 py-4">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map((user) => {
                            const userAgency = agencies.find(a => a.id === user.agencyId);
                            return (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                                <UserIcon size={16} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{user.name}</div>
                                                <div className="text-xs text-gray-500 font-mono">@{user.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx("px-2.5 py-1 rounded-full text-xs font-semibold",
                                            user.role === 'MASTER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                                                user.role.includes('MANAGER') ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                        )}>
                                            {availableRoles.find(r => r.value === user.role)?.label || user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {user.role === 'MASTER_ADMIN' ? '-' : (userAgency?.name || 'غير محدد')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={clsx("w-2 h-2 rounded-full", user.isActive ? "bg-green-500" : "bg-red-500")}></div>
                                            <span className={clsx(user.isActive ? "text-green-700" : "text-red-700")}>
                                                {user.isActive ? 'نشط' : 'معطل'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-xs">
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleOpenEdit(user)}
                                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition" title="تعديل"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(user.id, user.isActive)}
                                                className={clsx("p-1.5 rounded-md transition", user.isActive ? "text-orange-500 hover:bg-orange-50" : "text-green-600 hover:bg-green-50")}
                                                title={user.isActive ? 'تعطيل' : 'تفعيل'}
                                            >
                                                <Power size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition" title="حذف"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-bold text-lg text-gray-900">
                                {editingUser ? 'تعديل بيانات المستخدم' : 'مستخدم جديد'}
                            </h3>
                            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                                    <input
                                        name="name"
                                        type="text"
                                        defaultValue={editingUser?.name}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
                                    <input
                                        name="username"
                                        type="text"
                                        defaultValue={editingUser?.username}
                                        required
                                        readOnly={!!editingUser} // Prevent changing username for simplicity
                                        className={clsx("w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500", editingUser && "bg-gray-100 text-gray-500")}
                                    />
                                </div>
                            </div>

                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                                    <input
                                        name="password"
                                        type="password"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                                        placeholder="******"
                                    />
                                </div>
                            )}

                            {editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">تغيير كلمة المرور (اختياري)</label>
                                    <input
                                        name="password"
                                        type="password"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                                        placeholder="اتركه فارغاً للإبقاء على الحالية"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الدور (Role)</label>
                                <select
                                    name="role"
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value as Role)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                                >
                                    {availableRoles.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedRole !== 'MASTER_ADMIN' && selectedRole !== 'ADMIN' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الوكالة التابعة</label>
                                    <select
                                        name="agencyId"
                                        defaultValue={editingUser?.agencyId}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                                    >
                                        <option value="">اختر وكالة...</option>
                                        {agencies.filter(a => a.isActive).map(a => (
                                            <option key={a.id} value={a.id}>{a.name} ({a.type === 'OWNER' ? 'المالك' : 'شريك'})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={handleClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">إلغاء</button>
                                <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                                    {isProcessing ? 'جاري المعالجة...' : 'حفظ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

