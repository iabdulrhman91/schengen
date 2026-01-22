"use server";

import { getSession } from "../actions";
import { storage } from "../storage";
import { Case } from "../storage/types";

interface GetCasesPaginatedParams {
    page?: number;
    pageSize?: number;
    filters?: Record<string, any>;
    sorting?: Array<{ id: string; desc: boolean }>;
    search?: string;
}

interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

/**
 * Server-side paginated cases fetching
 * Supports filtering, sorting, and search
 */
export async function getCasesPaginatedAction(
    params: GetCasesPaginatedParams = {}
): Promise<PaginatedResponse<Case>> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const {
        page = 1,
        pageSize = 50,
        filters = {},
        sorting = [],
        search = ""
    } = params;

    // Get all cases (filtered by role)
    let allCases = await storage.getCases();

    // Role-based filtering
    if (session.role === 'EMPLOYEE') {
        allCases = allCases.filter(c => c.createdBy === session.id);
    } else if (session.agencyId && session.role !== 'ADMIN' && session.role !== 'VISA_MANAGER') {
        allCases = allCases.filter(c => c.agencyId === session.agencyId);
    }

    // Apply search
    if (search) {
        const searchLower = search.toLowerCase();
        allCases = allCases.filter(c =>
            c.fileNumber?.toLowerCase().includes(searchLower) ||
            c.applicants?.some(a =>
                a.nameInPassport?.toLowerCase().includes(searchLower) ||
                a.passportNumber?.toLowerCase().includes(searchLower)
            )
        );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            if (Array.isArray(value) && value.length > 0) {
                // Multi-select filter (e.g., statusId)
                allCases = allCases.filter(c => value.includes((c as any)[key]));
            } else if (typeof value === 'string' && value) {
                // Text filter
                allCases = allCases.filter(c =>
                    String((c as any)[key] || '').toLowerCase().includes(value.toLowerCase())
                );
            }
        }
    });

    // Apply sorting
    if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        allCases.sort((a, b) => {
            const valA = (a as any)[id] || '';
            const valB = (b as any)[id] || '';
            if (valA < valB) return desc ? 1 : -1;
            if (valA > valB) return desc ? -1 : 1;
            return 0;
        });
    }

    // Pagination
    const total = allCases.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedCases = allCases.slice(start, end);

    return {
        data: paginatedCases,
        total,
        page,
        pageSize,
        totalPages
    };
}

/**
 * Save user table preferences
 */
export async function saveTablePreferencesAction(prefs: any) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    return await storage.saveUserTablePreference(session.id, "cases", prefs);
}

/**
 * Get user table preferences
 */
export async function getTablePreferencesAction() {
    const session = await getSession();
    if (!session) return null;

    return await storage.getUserTablePreference(session.id, "cases");
}

/**
 * Toggle V2 table for current user
 */
export async function toggleTableV2Action(enabled: boolean) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    return await storage.saveUserTablePreference(session.id, "cases", { defaultViewId: enabled ? 'v2' : 'default' });
}
