import fs from 'fs';
import path from 'path';

// In-memory mock data store to replace Prisma temporarily
export type Role = 'ADMIN' | 'VISA_MANAGER' | 'EMPLOYEE' | 'AGENCY_MANAGER' | 'AGENCY_USER';

export interface Agency {
    id: string;
    name: string;
}

export interface User {
    id: string;
    username: string;
    name: string;
    role: Role;
    agencyId?: string;
}

export interface Appointment {
    id: string;
    code: string;
    country: string;
    date: string; // ISO string
    capacity: number;
    status: 'OPEN' | 'CLOSED';
}

export interface Case {
    id: string;
    agencyId: string;
    appointmentId?: string;
    fileNumber: string;
    travelDate?: string;
    returnDate?: string;
    lockStatus: 'DRAFT' | 'SUBMITTED';
    appointmentStatus: 'CONFIRMED' | 'WAITING';
    applicants: Applicant[];
}

export interface Applicant {
    id: string;
    caseId: string;
    type: 'MAIN' | 'DEPENDENT';
    nameInPassport: string;
    passportNumber: string;
    passportImage?: string;
    mobileNumber?: string;
    birthDate?: string;
    passportIssueDate?: string;
    passportExpiryDate?: string;
    nationality?: string;
    nationalId?: string;
    placeOfBirthEn?: string;
    gender?: string;
    maritalStatus?: string;
    isEmployee?: boolean;
    employerEn?: string;
    jobTitleEn?: string;
}

const DB_PATH = path.join(process.cwd(), 'db.json');

// Initial Seed Data
const INITIAL_DB: {
    agencies: Agency[];
    users: User[];
    appointments: Appointment[];
    cases: Case[];
} = {
    agencies: [
        { id: 'agency-a', name: 'وكالة النور (A)' },
        { id: 'agency-b', name: 'وكالة المسافر (B)' },
    ],
    users: [
        { id: 'u1', username: 'admin', name: 'المدير العام', role: 'ADMIN' },
        { id: 'u2', username: 'visa', name: 'مسؤول التأشيرات', role: 'VISA_MANAGER' },
        { id: 'u3', username: 'agentA', name: 'موظف أ', role: 'AGENCY_USER', agencyId: 'agency-a' },
        { id: 'u4', username: 'agentB', name: 'موظف ب', role: 'AGENCY_USER', agencyId: 'agency-b' },
    ],
    appointments: [
        { id: 'appt-1', code: 'APPT-SMALL', country: 'SPAIN', date: '2024-12-20T10:00:00Z', capacity: 1, status: 'OPEN' },
        { id: 'appt-2', code: 'APPT-BIG', country: 'FRANCE', date: '2024-12-21T09:00:00Z', capacity: 35, status: 'OPEN' },
    ],
    cases: []
};

function readDb(): typeof INITIAL_DB {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DB, null, 2));
        return INITIAL_DB;
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as typeof INITIAL_DB;
}

function writeDb(data: typeof INITIAL_DB) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// API Methods
export const db = {
    agency: {
        findMany: async () => readDb().agencies,
        findUnique: async (id: string) => readDb().agencies.find((a) => a.id === id),
    },
    user: {
        findUnique: async (username: string) => readDb().users.find((u) => u.username === username),
    },
    appointment: {
        findMany: async () => readDb().appointments,
        findUnique: async (id: string) => readDb().appointments.find((a) => a.id === id),
        create: async (data: Omit<Appointment, 'id'>) => {
            const dbData = readDb();
            const newAppt: Appointment = { ...data, id: Math.random().toString().slice(2, 9) };
            dbData.appointments.push(newAppt);
            writeDb(dbData);
            return newAppt;
        }
    },
    case: {
        create: async (data: Omit<Case, 'id' | 'applicants'>) => {
            const dbData = readDb();
            const newCase: Case = { ...data, id: Math.random().toString().slice(2, 9), applicants: [] };
            dbData.cases.push(newCase);
            writeDb(dbData);
            return newCase;
        },
        update: async (id: string, data: Partial<Case>) => {
            const dbData = readDb();
            const idx = dbData.cases.findIndex((c) => c.id === id);
            if (idx === -1) throw new Error("Not found");

            const existing = dbData.cases[idx];
            const updated: Case = { ...existing, ...data };
            dbData.cases[idx] = updated;
            writeDb(dbData);
            return updated;
        },
        findMany: async (filter?: { agencyId?: string }) => {
            const dbData = readDb();
            let res = dbData.cases;
            if (filter) {
                res = res.filter((c) => {
                    if (filter.agencyId && c.agencyId !== filter.agencyId) return false;
                    return true;
                });
            }
            return res;
        },
        count: async (filter?: { appointmentId?: string, appointmentStatus?: string }) => {
            const dbData = readDb();
            let filtered = dbData.cases;
            if (filter?.appointmentId) filtered = filtered.filter((c) => c.appointmentId === filter.appointmentId);
            if (filter?.appointmentStatus) filtered = filtered.filter((c) => c.appointmentStatus === filter.appointmentStatus);
            return filtered.length;
        }
    }
};
