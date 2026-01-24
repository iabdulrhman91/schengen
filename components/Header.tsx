import { User, Agency, MASTER_AGENCY_ID } from '@/lib/storage/types';
import { logoutAction } from '@/lib/actions';
import { Button } from '@/components/ui/core';
import { ShieldAlert } from 'lucide-react';

export default function Header({ user, agency }: { user: User, agency: Agency | null }) {
    const isMaster = user.role === 'MASTER_ADMIN';

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
                    <span className="text-blue-600 font-bold">{user.name}</span>
                </h2>
                <div className="flex items-center gap-2">
                    {isMaster ? (
                        <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[11px] font-bold border border-blue-100 shadow-sm">
                            <ShieldAlert size={12} className="opacity-80" />
                            إدارة النظام
                        </span>
                    ) : agency ? (
                        <span className="bg-gray-50 text-gray-600 px-3 py-1 rounded-full text-[11px] font-bold border border-gray-100 italic">
                            {agency.name}
                        </span>
                    ) : null}
                </div>
            </div>
            <form action={logoutAction}>
                <Button variant="outline" size="sm" type="submit">
                    تسجيل خروج
                </Button>
            </form>
        </header>
    );
}
