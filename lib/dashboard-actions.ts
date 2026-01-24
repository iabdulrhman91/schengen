"use server";

import { getSession } from "./actions";
import { storage } from "./storage";
import { Case, User, Agency, Appointment } from "./storage/types";

// ============================================
// MASTER_ADMIN DASHBOARD STATS
// ============================================

export interface MasterDashboardStats {
    overview: {
        totalCases: number;
        totalAgencies: number;
        totalUsers: number;
        totalAppointments: number;
    };
    casesStats: {
        draftCases: number;
        confirmedCases: number;
        completedCases: number;
        todayCases: number;
        weekCases: number;
        monthCases: number;
    };
    appointmentsStats: {
        openAppointments: number;
        fullAppointments: number;
        upcomingAppointments: number;
    };
    topAgencies: Array<{
        id: string;
        name: string;
        casesCount: number;
        credit: number;
    }>;
    casesByCountry: Array<{
        countryId: string;
        countryName: string;
        count: number;
    }>;
    recentActivity: Array<{
        id: string;
        type: 'case' | 'appointment' | 'agency';
        description: string;
        timestamp: string;
    }>;
}

export async function getMasterDashboardStats(): Promise<MasterDashboardStats | null> {
    const session = await getSession();
    if (!session || session.role !== 'MASTER_ADMIN') {
        return null;
    }

    try {
        // Fetch all data
        const [allCases, allAgencies, allUsers, allAppointments] = await Promise.all([
            storage.getCases(),
            storage.getAgencies(false), // Include all
            storage.getUsers(false),
            storage.getAppointments(),
        ]);

        // Overview Stats
        const overview = {
            totalCases: allCases.length,
            totalAgencies: allAgencies.filter(a => !a.isDeleted).length,
            totalUsers: allUsers.filter(u => !u.isDeleted).length,
            totalAppointments: allAppointments.length,
        };

        // Cases Stats by Status and Time
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const casesStats = {
            draftCases: allCases.filter(c => c.statusId === 'os-new' || c.statusId === 'os-wait').length,
            confirmedCases: allCases.filter(c => c.statusId === 'os-ready' || c.statusId === 'os-bio').length,
            completedCases: allCases.filter(c => c.statusId === 'os-done').length,
            todayCases: allCases.filter(c => new Date(c.createdAt) >= todayStart).length,
            weekCases: allCases.filter(c => new Date(c.createdAt) >= weekStart).length,
            monthCases: allCases.filter(c => new Date(c.createdAt) >= monthStart).length,
        };

        // Appointments Stats
        const appointmentsStats = {
            openAppointments: allAppointments.filter(a => a.status === 'OPEN').length,
            fullAppointments: allAppointments.filter(a => a.status === 'FULL').length,
            upcomingAppointments: allAppointments.filter(a =>
                new Date(a.date) > now && a.status === 'OPEN'
            ).length,
        };

        // Top Agencies by Cases Count
        const agencyCaseCounts = allAgencies.map(agency => ({
            id: agency.id,
            name: agency.name,
            casesCount: allCases.filter(c => c.agencyId === agency.id).length,
            credit: agency.credit || 0,
        })).sort((a, b) => b.casesCount - a.casesCount).slice(0, 5);

        // Cases by Country
        const countries = await storage.getCountries(false);
        const casesByCountry = countries.map(country => ({
            countryId: country.id,
            countryName: country.name_ar,
            count: allCases.filter(c => {
                const appt = allAppointments.find(a => a.id === c.appointmentId);
                return appt?.countryId === country.id;
            }).length,
        })).filter(c => c.count > 0).sort((a, b) => b.count - a.count);

        // Recent Activity (last 5 cases)
        const recentCases = allCases
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
            .map(c => ({
                id: c.id,
                type: 'case' as const,
                description: `طلب جديد: ${c.fileNumber || c.id}`,
                timestamp: c.createdAt,
            }));

        return {
            overview,
            casesStats,
            appointmentsStats,
            topAgencies: agencyCaseCounts,
            casesByCountry,
            recentActivity: recentCases,
        };
    } catch (error) {
        console.error('[getMasterDashboardStats] Error:', error);
        return null;
    }
}

// ============================================
// AGENCY DASHBOARD STATS
// ============================================

export interface AgencyDashboardStats {
    overview: {
        myCases: number;
        pendingCases: number;
        completedCases: number;
        upcomingAppointments: number;
    };
    performance: {
        thisWeek: number;
        thisMonth: number;
        avgProcessingDays: number;
    };
    recentCases: Array<{
        id: string;
        fileNumber: string;
        statusId: string;
        createdAt: string;
    }>;
    upcomingAppointments: Array<{
        id: string;
        date: string;
        countryName: string;
        capacity: number;
    }>;
}

export async function getAgencyDashboardStats(): Promise<AgencyDashboardStats | null> {
    const session = await getSession();
    if (!session) {
        return null;
    }

    try {
        const [allCases, allAppointments, countries] = await Promise.all([
            storage.getCases(),
            storage.getAppointments(),
            storage.getCountries(false),
        ]);

        // Filter cases by agency
        const myCases = allCases.filter(c => c.agencyId === session.agencyId);

        // Overview
        const overview = {
            myCases: myCases.length,
            pendingCases: myCases.filter(c => c.statusId === 'os-new' || c.statusId === 'os-wait').length,
            completedCases: myCases.filter(c => c.statusId === 'os-done').length,
            upcomingAppointments: allAppointments.filter(a =>
                new Date(a.date) > new Date() && a.status === 'OPEN'
            ).length,
        };

        // Performance
        const now = new Date();
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const performance = {
            thisWeek: myCases.filter(c => new Date(c.createdAt) >= weekStart).length,
            thisMonth: myCases.filter(c => new Date(c.createdAt) >= monthStart).length,
            avgProcessingDays: 3, // Placeholder - would need real calculation
        };

        // Recent Cases
        const recentCases = myCases
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
            .map(c => ({
                id: c.id,
                fileNumber: c.fileNumber || 'N/A',
                statusId: c.statusId,
                createdAt: c.createdAt,
            }));

        // Upcoming Appointments
        const upcomingAppointments = allAppointments
            .filter(a => new Date(a.date) > now && a.status === 'OPEN')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 3)
            .map(a => {
                const country = countries.find(c => c.id === a.countryId);
                return {
                    id: a.id,
                    date: a.date,
                    countryName: country?.name_ar || 'غير معروف',
                    capacity: a.capacity,
                };
            });

        return {
            overview,
            performance,
            recentCases,
            upcomingAppointments,
        };
    } catch (error) {
        console.error('[getAgencyDashboardStats] Error:', error);
        return null;
    }
}
