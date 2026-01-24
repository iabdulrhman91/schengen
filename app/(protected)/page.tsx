import { getSession } from "@/lib/actions";
import { getMasterDashboardStats, getAgencyDashboardStats } from "@/lib/dashboard-actions";
import { redirect } from "next/navigation";
import {
    Users,
    FileText,
    Calendar,
    Building2,
    TrendingUp,
    Activity,
    CheckCircle2,
    Clock,
    Zap,
    Target
} from "lucide-react";
import {
    StatCard,
    CasesByCountryChart,
    AgencyPerformanceChart,
    StatusDistributionChart,
    ActivityFeed,
    QuickStatsGrid
} from "@/components/dashboard/DashboardCharts";
import Link from "next/link";
import { Button } from "@/components/ui/core";

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const isMaster = session.role === 'MASTER_ADMIN';

    // Fetch stats based on role
    const masterStats = isMaster ? await getMasterDashboardStats() : null;
    const agencyStats = !isMaster ? await getAgencyDashboardStats() : null;

    return (
        <div className="space-y-8 pb-10" dir="rtl">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 rounded-3xl p-8 text-white shadow-2xl">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">
                                {isMaster ? 'مركز القيادة' : 'لوحة التحكم'}
                            </span>
                        </div>
                        <h1 className="text-4xl font-black mb-2">
                            {isMaster ? 'أهلاً بك، القائد' : 'مرحباً'}
                        </h1>
                        <p className="text-blue-100 text-lg font-bold">
                            {session.name}
                        </p>
                    </div>
                    <Link href="/requests/new">
                        <Button className="bg-white text-blue-900 hover:bg-blue-50 font-black px-8 py-6 text-lg rounded-2xl shadow-xl">
                            + طلب جديد
                        </Button>
                    </Link>
                </div>
            </div>

            {/* MASTER_ADMIN DASHBOARD */}
            {isMaster && masterStats && (
                <div className="space-y-8">
                    {/* Overview Stats */}
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 mb-4">نظرة عامة</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                title="إجمالي الطلبات"
                                value={masterStats.overview.totalCases}
                                icon={<FileText className="w-6 h-6" />}
                                color="blue"
                                trend="+12%"
                            />
                            <StatCard
                                title="الوكالات النشطة"
                                value={masterStats.overview.totalAgencies}
                                icon={<Building2 className="w-6 h-6" />}
                                color="green"
                            />
                            <StatCard
                                title="المستخدمين"
                                value={masterStats.overview.totalUsers}
                                icon={<Users className="w-6 h-6" />}
                                color="purple"
                            />
                            <StatCard
                                title="المواعيد"
                                value={masterStats.overview.totalAppointments}
                                icon={<Calendar className="w-6 h-6" />}
                                color="amber"
                            />
                        </div>
                    </div>

                    {/* Time-based Stats */}
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 mb-4">الطلبات الجديدة</h2>
                        <QuickStatsGrid stats={{
                            today: masterStats.casesStats.todayCases,
                            week: masterStats.casesStats.weekCases,
                            month: masterStats.casesStats.monthCases,
                        }} />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <StatusDistributionChart
                            draft={masterStats.casesStats.draftCases}
                            confirmed={masterStats.casesStats.confirmedCases}
                            completed={masterStats.casesStats.completedCases}
                        />
                        {masterStats.casesByCountry.length > 0 && (
                            <CasesByCountryChart data={masterStats.casesByCountry} />
                        )}
                    </div>

                    {/* Agency Performance */}
                    {masterStats.topAgencies.length > 0 && (
                        <AgencyPerformanceChart data={masterStats.topAgencies} />
                    )}

                    {/* Recent Activity */}
                    <ActivityFeed activities={masterStats.recentActivity} />
                </div>
            )}

            {/* AGENCY DASHBOARD */}
            {!isMaster && agencyStats && (
                <div className="space-y-8">
                    {/* Overview Stats */}
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 mb-4">نظرة عامة</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                title="طلباتي"
                                value={agencyStats.overview.myCases}
                                icon={<FileText className="w-6 h-6" />}
                                color="blue"
                            />
                            <StatCard
                                title="معلقة"
                                value={agencyStats.overview.pendingCases}
                                icon={<Clock className="w-6 h-6" />}
                                color="amber"
                            />
                            <StatCard
                                title="مكتملة"
                                value={agencyStats.overview.completedCases}
                                icon={<CheckCircle2 className="w-6 h-6" />}
                                color="green"
                            />
                            <StatCard
                                title="مواعيد قادمة"
                                value={agencyStats.overview.upcomingAppointments}
                                icon={<Calendar className="w-6 h-6" />}
                                color="purple"
                            />
                        </div>
                    </div>

                    {/* Performance */}
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 mb-4">أدائي</h2>
                        <QuickStatsGrid stats={{
                            today: 0, // Placeholder
                            week: agencyStats.performance.thisWeek,
                            month: agencyStats.performance.thisMonth,
                        }} />
                    </div>

                    {/* Upcoming Appointments */}
                    {agencyStats.upcomingAppointments.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <h3 className="text-xl font-black text-gray-900 mb-6">المواعيد القادمة</h3>
                            <div className="space-y-4">
                                {agencyStats.upcomingAppointments.map((appt) => (
                                    <div key={appt.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                                        <div>
                                            <div className="font-bold text-gray-900">{appt.countryName}</div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                {new Date(appt.date).toLocaleDateString('ar-SA', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500">السعة المتبقية</div>
                                            <div className="text-2xl font-black text-blue-600">{appt.capacity}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recent Cases */}
                    {agencyStats.recentCases.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <h3 className="text-xl font-black text-gray-900 mb-6">آخر الطلبات</h3>
                            <div className="space-y-3">
                                {agencyStats.recentCases.map((c) => (
                                    <Link
                                        key={c.id}
                                        href={`/requests/${c.id}`}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{c.fileNumber}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">{c.statusId}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {new Date(c.createdAt).toLocaleDateString('ar-SA')}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
