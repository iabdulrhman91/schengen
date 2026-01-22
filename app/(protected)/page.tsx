'use client';

import { useState, useEffect } from "react";
import { getMyCases, getCountriesAction } from "@/lib/actions"; // Added getCountriesAction
import { MASTER_AGENCY_ID, Case, Appointment, Agency, Country } from "@/lib/storage/types"; // Added Country
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/core";
import Link from "next/link";
import {
    Users,
    FileText,
    Calendar as CalendarIcon,
    Clock,
    PlusCircle,
    ChevronRight,
    TrendingUp,
    ShieldCheck,
    Zap,
    MapPin,
    ArrowRight,
    LayoutDashboard,
    CheckCircle2
} from "lucide-react";

export default function DashboardPage() {
    const [session, setSession] = useState<any>(null);
    const [myCases, setMyCases] = useState<Case[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [countries, setCountries] = useState<Country[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetch('/api/auth/session').then(r => r.json());
                setSession(res?.user);

                const cases = await getMyCases();
                setMyCases(cases);

                const countriesData = await getCountriesAction(false);
                setCountries(countriesData);

                // Mock appointments for demo (should be fetched)
                // Using IDs consistent with newly created types
                setAppointments([
                    { id: '1', code: 'SP-10', countryId: countriesData.find(c => c.code === 'SPAIN')?.id || 'c1', locationId: 'l1', date: '2026-01-10T10:00:00Z', capacity: 5, status: 'OPEN' },
                    { id: '4', code: 'FR-11', countryId: countriesData.find(c => c.code === 'FRANCE')?.id || 'c2', locationId: 'l2', date: '2026-01-11T10:00:00Z', capacity: 8, status: 'OPEN' },
                ]);

            } catch (error) {
                console.error("Dashboard error:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="font-bold text-gray-400">جاري الربط مع مركز البيانات...</p>
        </div>
    );

    if (!session) return <div className="p-10 text-center text-red-500">يرجى تسجيل الدخول أولاً.</div>;

    const isMaster = session.role === 'ADMIN' || session.role === 'VISA_MANAGER';

    // Stats calc
    const totalCases = myCases.length;
    const confirmedCases = myCases.filter(c => c.statusId === 'os-ready' || c.statusId === 'os-bio').length;
    const waitingCases = myCases.filter(c => c.statusId === 'os-new' || c.statusId === 'os-wait').length;
    const recentCases = [...myCases].sort((a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    ).slice(0, 3);

    return (
        <div className="space-y-10 pb-10 animate-in fade-in zoom-in-95 duration-700" dir="rtl">
            {/* Super Hero Section */}
            <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-blue-700 via-blue-900 to-black p-8 lg:p-14 text-white shadow-2xl shadow-blue-900/30 border border-white/5">
                <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-blue-500/10 rounded-full -mr-80 -mt-80 blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full -ml-40 -mb-40 blur-[100px]" />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    <div className="lg:col-span-7 space-y-6">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-blue-200">
                            <Zap size={14} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                            <span>{isMaster ? 'مركز القيادة والسيطرة الشامل' : 'مساحة العمل الموحدة'}</span>
                        </div>
                        <h1 className="text-6xl lg:text-7xl font-black tracking-tighter leading-tight font-premium">
                            {isMaster ? 'أهلاً بك، القائد' : 'مرحباً،'} <br />
                            <span className="bg-gradient-to-l from-blue-400 to-blue-100 bg-clip-text text-transparent">{session.name}</span>
                        </h1>
                        <p className="text-blue-100/60 text-xl max-w-xl leading-relaxed font-bold">
                            {isMaster
                                ? 'نظام تجوال الموحد تحت تصرفك. يمكنك الآن مراقبة الطلبات العالمية، إدارة الوكالات الموزعة بضغطة زر.'
                                : 'لديك وصول مباشر لكافة خدمات الشنغن. ابحث عن المواعيد وأرسل الطلبات فوراً.'}
                        </p>
                    </div>

                    <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                        <HeroStatBox label="إجمالي الحالات" value={totalCases} icon={FileText} trend="+12%" />
                        <HeroStatBox label="الحالات المؤكدة" value={confirmedCases} icon={ShieldCheck} trend="+8%" />
                        <HeroStatBox label="الوكالات المشتركة" value={isMaster ? 5 : 1} icon={Users} trend="نشط" />
                        <HeroStatBox label="كفاءة النظام" value="99%" icon={Zap} trend="ممتاز" />
                    </div>
                </div>
            </div>

            {/* Main Operational Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* Left Side: Ultra-Simple Embassy Status Cards */}
                <div className="xl:col-span-8 space-y-8">
                    <div className="px-4">
                        <h2 className="text-4xl font-black text-gray-900 font-premium tracking-tight">التوفر الحالي للمواعيد</h2>
                        <p className="text-gray-500 mt-2 font-bold text-lg">أقرب مواعيد حضور السفارة المتاحة للحجز الفوري</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {['SPAIN', 'FRANCE'].map(countryCode => {
                            const country = countries.find(c => c.code === countryCode);
                            if (!country) return null;

                            const nextAppt = appointments
                                .filter(a => a.countryId === country.id && a.status === 'OPEN')
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

                            const flag = countryCode === 'SPAIN' ? '🇪🇸' : '🇫🇷';
                            const label = country.name_ar;
                            const colorClass = countryCode === 'SPAIN' ? 'from-red-500 to-yellow-500' : 'from-blue-600 to-white';

                            return (
                                <Card key={countryCode} className="rounded-[3rem] border-none bg-white p-2 shadow-[0_48px_80px_-16px_rgba(0,0,0,0.08)] overflow-hidden group">
                                    <div className={`h-32 bg-gradient-to-br transition-all group-hover:h-40 relative flex items-center justify-center ${countryCode === 'SPAIN' ? 'from-red-600 to-yellow-500' : 'from-blue-700 to-indigo-900'
                                        }`}>
                                        <span className="text-7xl drop-shadow-2xl translate-y-4 group-hover:scale-110 transition-transform">{flag}</span>
                                        <div className="absolute top-6 right-8 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em]">
                                            {label}
                                        </div>
                                    </div>

                                    <CardContent className="p-10 pt-14 space-y-8 relative">
                                        {!nextAppt ? (
                                            <div className="text-center py-6">
                                                <div className="text-gray-300 font-black text-xl mb-2">لا توجد مواعيد متاحة</div>
                                                <p className="text-gray-400 text-sm font-bold tracking-tight">سيتم إشعاركم فور فتح مواعيد جديدة</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-end border-b border-gray-50 pb-6">
                                                    <div>
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">أقرب موعد متاح</div>
                                                        <div className="text-3xl font-black text-gray-900 leading-none">
                                                            {new Date(nextAppt.date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })}
                                                            <div className="text-sm font-bold text-blue-600 mt-2">
                                                                يوم {new Date(nextAppt.date).toLocaleDateString('ar-SA', { weekday: 'long' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">السعة المتبقية</div>
                                                        <div className="text-2xl font-black text-emerald-500">{nextAppt.capacity}</div>
                                                    </div>
                                                </div>

                                                <Link href={`/requests/new?appointmentId=${nextAppt.id}`} className="block">
                                                    <Button className="w-full h-16 rounded-2xl bg-gray-900 hover:bg-blue-600 text-white font-black transition-all flex items-center justify-center gap-3 group/btn">
                                                        <span>بدء طلب جديد الآن</span>
                                                        <ArrowRight size={20} className="rotate-180 group-hover/btn:translate-x-[-4px] transition-transform" />
                                                    </Button>
                                                </Link>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* Right Side: Quick Actions & Intelligence */}
                <div className="xl:col-span-4 space-y-10">
                    {/* Primary Button */}
                    <Link href="/requests/new">
                        <Button className="w-full h-24 rounded-[2.5rem] bg-black hover:bg-gray-900 text-white font-black text-2xl shadow-2xl shadow-black/20 flex items-center justify-center gap-4 transition-all hover:translate-y-[-6px] group active:translate-y-0">
                            <PlusCircle size={28} className="transition-transform group-hover:rotate-180 duration-500" />
                            <span>{isMaster ? 'إضافة ملف شامل' : 'بدء طلب جديد'}</span>
                        </Button>
                    </Link>

                    {/* Quick Access Portal */}
                    <div className="grid grid-cols-2 gap-4">
                        <PortalLink label="المواعيد" icon={CalendarIcon} href="/appointments" color="blue" />
                        <PortalLink label="الوكلاء" icon={Users} href="/admin/agencies" color="indigo" />
                        <PortalLink label="المستخدمين" icon={Users} href="/admin/users" color="violet" />
                        <PortalLink label="الويب هوك" icon={Zap} href="/admin/webhooks" color="amber" />
                    </div>

                    {/* Feed Section */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-3">
                            <h3 className="text-2xl font-black text-gray-900 font-premium">الطلبات الحديثة</h3>
                            <Link href="/requests" className="text-gray-400 group flex items-center gap-1 hover:text-blue-600 transition-colors">
                                <span className="text-xs font-bold uppercase">الكل</span>
                                <ChevronRight size={18} className="rotate-180" />
                            </Link>
                        </div>
                        <div className="bg-white rounded-[3rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden divide-y divide-gray-50">
                            {recentCases.map(c => (
                                <div key={c.id} className="p-6 flex items-center justify-between hover:bg-blue-50/30 transition-all group cursor-pointer border-r-4 border-r-transparent hover:border-r-blue-600">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-blue-600/20 transition-all duration-300">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <div className="font-black text-gray-900 uppercase tracking-tight text-lg leading-none">{c.fileNumber || 'UNLINKED'}</div>
                                            <div className="text-[11px] font-bold text-gray-400 mt-2 uppercase tracking-widest">{new Date(c.createdAt).toLocaleDateString('ar-SA')} • {c.statusId}</div>
                                        </div>
                                    </div>
                                    <ArrowRight size={20} className="text-gray-200 group-hover:text-blue-600 transition-all rotate-180" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function HeroStatBox({ label, value, icon: Icon, trend }: any) {
    return (
        <div className="bg-white/5 backdrop-blur-3xl p-5 rounded-3xl border border-white/10 hover:border-white/20 transition-all group overflow-hidden relative">
            <div className="absolute -bottom-4 -right-4 text-white opacity-[0.03] group-hover:opacity-10 transition-all group-hover:scale-125">
                <Icon size={80} />
            </div>
            <div className="flex justify-between items-start mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300">
                    <Icon size={18} />
                </div>
                <span className="text-[10px] font-black text-emerald-400 p-1 bg-emerald-400/10 rounded-lg">{trend}</span>
            </div>
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-[9px] font-black text-blue-200/40 uppercase mt-1 tracking-widest">{label}</div>
        </div>
    );
}

function PortalLink({ label, icon: Icon, href, color }: any) {
    const themes: any = {
        blue: 'hover:bg-blue-600/5 hover:border-blue-600/30 text-blue-700',
        indigo: 'hover:bg-indigo-600/5 hover:border-indigo-600/30 text-indigo-700',
        violet: 'hover:bg-violet-600/5 hover:border-violet-600/30 text-violet-700',
        amber: 'hover:bg-amber-600/5 hover:border-amber-600/30 text-amber-900',
    };
    return (
        <Link href={href}>
            <div className={`bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 transition-all hover:shadow-2xl hover:translate-y-[-4px] active:scale-95 flex flex-col items-center gap-4 text-center group ${themes[color]}`}>
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-current group-hover:text-white transition-all shadow-inner">
                    <Icon size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">{label}</span>
            </div>
        </Link>
    );
}
