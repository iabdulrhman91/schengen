'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, FileText, PlusCircle, Users, Briefcase } from 'lucide-react';
import { User, Role } from '@/lib/data';
import clsx from 'clsx';

export default function Sidebar({ user }: { user: User }) {
    const pathname = usePathname();

    const isAdmin = user.role === 'ADMIN';
    const isVisa = user.role === 'VISA_MANAGER';
    const isAgency = user.role === 'AGENCY_USER' || user.role === 'AGENCY_MANAGER';

    const links = [
        {
            label: 'لوحة التحكم',
            href: '/',
            icon: LayoutDashboard,
            show: true,
        },
        {
            label: 'إدارة المواعيد',
            href: '/appointments',
            icon: Calendar,
            show: isAdmin || isVisa,
        },
        {
            label: 'قائمة المواعيد',
            href: '/appointments',
            icon: Calendar,
            show: isAgency, // Read only view for agency if they want to see availability outside wizard
        },
        {
            label: 'طلبات الشنغن',
            href: '/requests',
            icon: FileText,
            show: true,
        },
        {
            label: 'إنشاء طلب جديد',
            href: '/requests/new',
            icon: PlusCircle,
            show: true,
        },
        {
            label: 'إدارة الوكالات',
            href: '/admin/agencies',
            icon: Briefcase,
            show: isAdmin,
        },
        {
            label: 'إدارة المستخدمين',
            href: '/admin/users',
            icon: Users,
            show: isAdmin,
        },
        {
            label: 'سجل التنبيهات',
            href: '/admin/webhooks',
            icon: FileText,
            show: isAdmin || isVisa,
        },
        {
            label: 'إدارة الأسعار',
            href: '/admin/pricing',
            icon: Briefcase, // using Briefcase as placeholder or maybe a different one like BadgeDollarSign if available, but Briefcase is safe
            show: isAdmin,
        },
    ];

    return (
        <aside className="w-64 shrink-0 bg-white border-l border-gray-200 hidden md:flex flex-col h-screen sticky top-0">
            <div className="h-16 flex items-center justify-center border-b border-gray-100 shrink-0">
                <h1 className="text-xl font-bold text-blue-800 tracking-tight">تجوال شنغن</h1>
            </div>

            <div className="p-4 space-y-1 flex-1 overflow-y-auto scrollbar-hide">
                <div className="px-2 py-2 text-xs font-black text-gray-400 uppercase tracking-wider">القائمة الرئيسية</div>
                {links.map((link) => {
                    if (!link.show) return null;
                    const isActive = pathname === link.href;
                    const Icon = link.icon;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={clsx(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group whitespace-nowrap',
                                isActive
                                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            )}
                        >
                            <Icon size={18} className={clsx("transition-transform group-hover:scale-110", isActive && "text-blue-600")} strokeWidth={isActive ? 2 : 1.5} />
                            <span>{link.label}</span>
                        </Link>
                    );
                })}
            </div>

            <div className="p-4 border-t border-gray-100 shrink-0 bg-white z-10">
                <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0 border-2 border-white ring-1 ring-blue-50">
                        {user.name.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-black text-gray-900 truncate leading-tight">{user.name}</p>
                        <p className="text-[10px] text-blue-600 font-bold truncate uppercase tracking-tight mt-0.5">
                            {isAdmin ? 'مدير عام النظام' : 'عضو الوكالة'}
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
