"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: string;
    color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

export function StatCard({ title, value, subtitle, icon, trend, color = 'blue' }: StatCardProps) {
    const colorClasses = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        amber: 'from-amber-500 to-amber-600',
        red: 'from-red-500 to-red-600',
        purple: 'from-purple-500 to-purple-600',
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white shadow-md`}>
                    {icon}
                </div>
                {trend && (
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        {trend}
                    </span>
                )}
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">{value}</div>
            <div className="text-sm font-bold text-gray-500">{title}</div>
            {subtitle && (
                <div className="text-xs text-gray-400 mt-2">{subtitle}</div>
            )}
        </div>
    );
}

interface CasesByCountryChartProps {
    data: Array<{ countryName: string; count: number }>;
}

export function CasesByCountryChart({ data }: CasesByCountryChartProps) {
    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-black text-gray-900 mb-6">الطلبات حسب الدولة</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="countryName" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                        labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

interface AgencyPerformanceChartProps {
    data: Array<{ name: string; casesCount: number; credit: number }>;
}

export function AgencyPerformanceChart({ data }: AgencyPerformanceChartProps) {
    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-black text-gray-900 mb-6">أداء الوكالات</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="casesCount" fill="#10b981" radius={[0, 8, 8, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

interface StatusDistributionChartProps {
    draft: number;
    confirmed: number;
    completed: number;
}

export function StatusDistributionChart({ draft, confirmed, completed }: StatusDistributionChartProps) {
    const data = [
        { name: 'مسودة', value: draft },
        { name: 'مؤكدة', value: confirmed },
        { name: 'مكتملة', value: completed },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-black text-gray-900 mb-6">توزيع حالة الطلبات</h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

interface ActivityFeedProps {
    activities: Array<{
        id: string;
        description: string;
        timestamp: string;
    }>;
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-black text-gray-900 mb-6">النشاط الأخير</h3>
            <div className="space-y-4">
                {activities.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        لا توجد أنشطة حديثة
                    </div>
                ) : (
                    activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-gray-900">{activity.description}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                    {new Date(activity.timestamp).toLocaleString('ar-SA', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

interface QuickStatsGridProps {
    stats: {
        today: number;
        week: number;
        month: number;
    };
}

export function QuickStatsGrid({ stats }: QuickStatsGridProps) {
    return (
        <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="text-2xl font-black text-blue-900">{stats.today}</div>
                <div className="text-xs font-bold text-blue-700 mt-1">اليوم</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="text-2xl font-black text-green-900">{stats.week}</div>
                <div className="text-xs font-bold text-green-700 mt-1">هذا الأسبوع</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="text-2xl font-black text-purple-900">{stats.month}</div>
                <div className="text-xs font-bold text-purple-700 mt-1">هذا الشهر</div>
            </div>
        </div>
    );
}
