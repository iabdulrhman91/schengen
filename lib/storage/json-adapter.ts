import fs from 'fs';
import path from 'path';
import { IStorage, Agency, User, Appointment, Case, Applicant, AuditLog, WebhookLog, AmendmentRequest, Country, Location, PriceBook, PriceOverride, ParsedPricing, OperationalStatus, UserViewPreference, TableSchema, TableView } from './types';

const DB_PATH = path.join(process.cwd(), 'db.json');

const INITIAL_DB: {
    agencies: Agency[];
    users: User[];
    appointments: Appointment[];
    cases: Case[];
    countries: Country[];
    locations: Location[];
    amendmentRequests?: AmendmentRequest[];
    webhookLogs?: WebhookLog[];
    priceBooks: PriceBook[];
    priceOverrides?: PriceOverride[];
    operationalStatuses: OperationalStatus[];
    userPreferences?: UserViewPreference[];
    tableSchemas?: TableSchema[];
    tableViews?: TableView[];
} = {
    agencies: [
        { id: 'tejwal', name: 'تجوال (الوكالة الأم)', type: 'OWNER', isActive: true, credit: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'agency-a', name: 'وكالة النور (A)', type: 'PARTNER', isActive: true, credit: 5000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'agency-b', name: 'وكالة المسافر (B)', type: 'PARTNER', isActive: true, credit: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    users: [
        // Password for all: 123
        { id: 'u1', username: 'admin', password: '$2a$10$8iYvO0L5.X6f8oFz8P6PZeM6qFfN0E5K8uUo/G0YhI5n0yA3x6K6u', name: 'مدير النظام', role: 'ADMIN', isActive: true },
        { id: 'u2', username: 'manager', password: '$2a$10$8iYvO0L5.X6f8oFz8P6PZeM6qFfN0E5K8uUo/G0YhI5n0yA3x6K6u', name: 'مدير تأشيرات', role: 'VISA_MANAGER', isActive: true },
        { id: 'u3', username: 'employee', password: '$2a$10$8iYvO0L5.X6f8oFz8P6PZeM6qFfN0E5K8uUo/G0YhI5n0yA3x6K6u', name: 'موظف عمليات', role: 'EMPLOYEE', isActive: true },
        { id: 'u4', username: 'agentA', password: '$2a$10$8iYvO0L5.X6f8oFz8P6PZeM6qFfN0E5K8uUo/G0YhI5n0yA3x6K6u', name: 'وكالة النور', role: 'AGENCY_MANAGER', agencyId: 'agency-a', isActive: true },
        { id: 'u5', username: 'agentB', password: '$2a$10$8iYvO0L5.X6f8oFz8P6PZeM6qFfN0E5K8uUo/G0YhI5n0yA3x6K6u', name: 'وكالة المسافر', role: 'AGENCY_MANAGER', agencyId: 'agency-b', isActive: true },
    ],
    appointments: [
        { id: 'appt-1', code: 'APPT-SMALL', countryId: 'c1', locationId: 'l1', date: '2024-12-20', capacity: 1, status: 'OPEN' },
        { id: 'appt-2', code: 'APPT-LARGE', countryId: 'c1', locationId: 'l1', date: '2024-12-21', capacity: 200, status: 'OPEN' },
    ],
    cases: [],
    countries: [
        { id: "c1", name_ar: "إسبانيا", code: "SPAIN", is_active: true },
        { id: "c2", name_ar: "فرنسا", code: "FRANCE", is_active: true }
    ],
    locations: [
        { id: "l1", name_ar: "الرياض", code: "RUH", is_active: true },
        { id: "l2", name_ar: "جدة", code: "JED", is_active: true }
    ],
    operationalStatuses: [
        { id: 'os-new', label: 'طلب جديد', color: 'blue', isLocked: true, sortOrder: 0 },
        { id: 'os-review', label: 'قيد المراجعة', color: 'orange', sortOrder: 1 },
        { id: 'os-docs', label: 'انتظار النواقص', color: 'red', sortOrder: 2 },
        { id: 'os-booked', label: 'تم الحجز', color: 'purple', sortOrder: 3 },
        { id: 'os-ready', label: 'جاهز للبصمة', color: 'indigo', sortOrder: 4 },
        { id: 'os-submitted', label: 'تم التقديم', color: 'amber', sortOrder: 5 },
        { id: 'os-received', label: 'تم استلام الجواز', color: 'emerald', isLocked: true, sortOrder: 8 },
        { id: 'os-cancel', label: 'ملغي', color: 'red', isLocked: true, sortOrder: 9 },
    ],
    priceBooks: [
        {
            id: "pb-default-spain",
            countryId: "c1",
            name: "إسبانيا الأساسي 2024",
            currency: "SAR",
            is_active: true,
            is_default_for_country: true,
            normal_adult_price: 450,
            normal_child_price: 350,
            normal_infant_price: 150,
            vip_adult_price: 850,
            vip_child_price: 750,
            vip_infant_price: 250,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ],
    priceOverrides: [],
};

export class JsonStorage implements IStorage {
    private agencyId?: string;

    constructor(agencyId?: string) {
        this.agencyId = agencyId;
        if (!fs.existsSync(DB_PATH)) {
            this.writeDb(INITIAL_DB);
        } else {
            // Force update admin password to hashed version if it exists
            const db = this.readDb();
            const admin = db.users.find(u => u.username === 'admin');
            if (admin && admin.password === '123') {
                admin.password = '$2a$10$8iYvO0L5.X6f8oFz8P6PZeM6qFfN0E5K8uUo/G0YhI5n0yA3x6K6u';
                this.writeDb(db);
            }
        }
    }

    private readDb(): typeof INITIAL_DB {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data);
    }

    private writeDb(data: typeof INITIAL_DB) {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4));
    }

    // Agencies
    async getAgencies(includeDeleted = false): Promise<Agency[]> {
        const ags = this.readDb().agencies || [];
        // Migration support & Type Safety
        return ags
            .map(a => ({
                ...a,
                isActive: (a as any).status === 'ARCHIVED' ? false : (a.isActive ?? true), // Migrate old 'status'
                type: (a as any).type || (a.id === 'tejwal' ? 'OWNER' : 'PARTNER'), // Default type if missing
                credit: a.credit || 0,
                createdAt: a.createdAt || new Date().toISOString(),
                updatedAt: a.updatedAt || new Date().toISOString()
            }))
            .filter(a => includeDeleted ? true : !a.isDeleted);
    }

    async getAgency(id: string): Promise<Agency | null> {
        const all = await this.getAgencies(true); // Get even deleted to verify
        const agency = all.find(a => a.id === id);
        if (!agency || agency.isDeleted) return null; // Or return deleted if needed, but standard 'get' usually implies active record
        return agency;
    }

    async createAgency(data: Omit<Agency, 'id'>): Promise<Agency> {
        const db = this.readDb();
        const id = `agency-${Math.random().toString(36).substring(7)}`;
        const now = new Date().toISOString();

        const newAgency: Agency = {
            id,
            ...data,
            isActive: data.isActive ?? true,
            type: data.type || 'PARTNER',
            credit: data.credit || 0,
            createdAt: now,
            updatedAt: now
        };

        if (!db.agencies) db.agencies = [];
        db.agencies.push(newAgency);
        this.writeDb(db);
        return newAgency;
    }

    async updateAgency(id: string, data: Partial<Agency>): Promise<Agency> {
        const db = this.readDb();
        const idx = db.agencies.findIndex(a => a.id === id);
        if (idx === -1) throw new Error("Agency not found");

        const updated = { ...db.agencies[idx], ...data, updatedAt: new Date().toISOString() };
        db.agencies[idx] = updated;
        this.writeDb(db);
        return updated;
    }

    async deleteAgency(id: string): Promise<void> {
        const db = this.readDb();
        const idx = db.agencies.findIndex(a => a.id === id);
        if (idx !== -1) {
            db.agencies[idx].isDeleted = true;
            db.agencies[idx].isActive = false; // Disable as well
            db.agencies[idx].updatedAt = new Date().toISOString();
            this.writeDb(db);
        }
    }

    // Users
    async getUserByUsername(username: string): Promise<User | null> {
        const user = this.readDb().users.find(u => u.username === username) || null;
        if (user) return this.migrateUserIfNeeded(user);
        return null;
    }

    async getUserById(id: string): Promise<User | null> {
        const user = this.readDb().users.find(u => u.id === id) || null;
        if (user) return this.migrateUserIfNeeded(user);
        return null;
    }

    async getUsers(includeDeleted = false): Promise<User[]> {
        const users = this.readDb().users || [];
        // Migration: Default keys & Role fix
        return users
            .map(u => this.migrateUserIfNeeded({
                ...u,
                isActive: u.isActive ?? true,
                createdAt: u.createdAt || new Date().toISOString()
            }))
            .filter(u => includeDeleted ? true : !u.isDeleted);
    }

    // Internal helper for self-healing
    private migrateUserIfNeeded(user: User): User {
        // Self-Healing: Upgrade legacy 'admin' to 'MASTER_ADMIN'
        if ((user.username === 'admin' || user.username === 'iabdulrhman91') && user.role === 'ADMIN') {
            console.log(`[Self-Healing] Upgrading user ${user.username} to MASTER_ADMIN`);

            // Update in memory
            const updatedUser = { ...user, role: 'MASTER_ADMIN' as const };

            // Persist to DB silently
            // Note: We read-modify-write to be safe, though this might be slightly expensive on every read if not cached.
            // Since it's a one-time thing per corrupt state, it's fine.
            try {
                const db = this.readDb();
                const idx = db.users.findIndex(u => u.id === user.id);
                if (idx !== -1 && db.users[idx].role !== 'MASTER_ADMIN') {
                    db.users[idx].role = 'MASTER_ADMIN';
                    this.writeDb(db);
                }
            } catch (e) {
                console.error("[Self-Healing] Failed to persist admin upgrade", e);
            }

            return updatedUser;
        }
        return user;
    }

    async createUser(data: Omit<User, 'id'>): Promise<User> {
        const db = this.readDb();
        const id = `u-${Math.random().toString(36).substring(7)}`;
        const newUser: User = {
            id,
            ...data,
            isActive: data.isActive ?? true,
            createdAt: new Date().toISOString()
        };
        db.users.push(newUser);
        this.writeDb(db);
        return newUser;
    }

    async updateUser(id: string, data: Partial<User>): Promise<User> {
        const db = this.readDb();
        const idx = db.users.findIndex(u => u.id === id);
        if (idx === -1) throw new Error("User not found");
        db.users[idx] = { ...db.users[idx], ...data };
        this.writeDb(db);
        return db.users[idx];
    }

    async deleteUser(id: string): Promise<void> {
        const db = this.readDb();
        const idx = db.users.findIndex(u => u.id === id);
        if (idx !== -1) {
            db.users[idx].isDeleted = true;
            db.users[idx].isActive = false;
            this.writeDb(db);
        }
    }

    // Appointments
    async getAppointments(): Promise<Appointment[]> {
        return this.readDb().appointments || [];
    }

    async getAppointment(id: string): Promise<Appointment | null> {
        return this.readDb().appointments.find(a => a.id === id) || null;
    }

    async createAppointment(data: Omit<Appointment, 'id'>): Promise<Appointment> {
        const db = this.readDb();
        const id = `appt-${Math.random().toString(36).substring(7)}`;
        const newAppt = { id, ...data };
        db.appointments.push(newAppt);
        this.writeDb(db);
        return newAppt;
    }

    async updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment> {
        const db = this.readDb();
        const idx = db.appointments.findIndex(a => a.id === id);
        if (idx === -1) throw new Error("Appointment not found");
        db.appointments[idx] = { ...db.appointments[idx], ...data };
        this.writeDb(db);
        return db.appointments[idx];
    }

    async deleteAppointment(id: string): Promise<void> {
        const db = this.readDb();
        db.appointments = db.appointments.filter(a => a.id !== id);
        this.writeDb(db);
    }

    // Cases
    async getCases(filter?: { agencyId?: string; appointmentId?: string }): Promise<Case[]> {
        const db = this.readDb();
        let cases = db.cases || [];
        if (filter?.agencyId) {
            cases = cases.filter(c => c.agencyId === filter.agencyId);
        }
        if (filter?.appointmentId) {
            cases = cases.filter(c => c.appointmentId === filter.appointmentId);
        }
        return cases;
    }

    async getCase(id: string): Promise<Case | null> {
        return this.readDb().cases.find(c => c.id === id) || null;
    }

    async createCase(data: Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'applicants'>): Promise<Case> {
        const db = this.readDb();
        const id = `case-${Math.random().toString(36).substring(7)}`;
        const now = new Date().toISOString();
        const newCase: Case = {
            id,
            ...data,
            applicants: [],
            createdAt: now,
            updatedAt: now
        };
        db.cases.push(newCase);
        this.writeDb(db);
        return newCase;
    }

    async updateCase(id: string, data: Partial<Case>): Promise<Case> {
        const db = this.readDb();
        const idx = db.cases.findIndex(c => c.id === id);
        if (idx === -1) throw new Error("Case not found");
        db.cases[idx] = { ...db.cases[idx], ...data, updatedAt: new Date().toISOString() };
        this.writeDb(db);
        return db.cases[idx];
    }

    async deleteCase(id: string): Promise<void> {
        const db = this.readDb();
        db.cases = db.cases.filter(c => c.id !== id);
        this.writeDb(db);
    }

    // Operational Statuses
    async getOperationalStatuses(): Promise<OperationalStatus[]> {
        return this.readDb().operationalStatuses || [];
    }

    async createOperationalStatus(data: Omit<OperationalStatus, 'id'>): Promise<OperationalStatus> {
        const db = this.readDb();
        const id = `os-${Math.random().toString(36).substring(7)}`;
        const newStatus = { id, ...data };
        db.operationalStatuses.push(newStatus);
        this.writeDb(db);
        return newStatus;
    }

    async updateOperationalStatus(id: string, data: Partial<OperationalStatus>): Promise<OperationalStatus> {
        const db = this.readDb();
        const idx = db.operationalStatuses.findIndex(s => s.id === id);
        if (idx === -1) throw new Error("Status not found");
        db.operationalStatuses[idx] = { ...db.operationalStatuses[idx], ...data };
        this.writeDb(db);
        return db.operationalStatuses[idx];
    }

    async deleteOperationalStatus(id: string, migrateToId?: string): Promise<void> {
        const db = this.readDb();
        if (migrateToId) {
            db.cases.forEach(c => { if (c.statusId === id) c.statusId = migrateToId; });
        }
        db.operationalStatuses = db.operationalStatuses.filter(s => s.id !== id);
        this.writeDb(db);
    }

    // Notion-style Table Engine v2
    async getTableSchema(tableId: string): Promise<TableSchema | null> {
        const db = this.readDb();
        return (db.tableSchemas || []).find(s => s.id === tableId) || null;
    }

    async updateTableSchema(tableId: string, data: Partial<TableSchema>): Promise<TableSchema> {
        const db = this.readDb();
        if (!db.tableSchemas) db.tableSchemas = [];
        const idx = db.tableSchemas.findIndex(s => s.id === tableId);
        if (idx >= 0) {
            db.tableSchemas[idx] = { ...db.tableSchemas[idx], ...data };
            this.writeDb(db);
            return db.tableSchemas[idx];
        } else {
            const newSchema = { id: tableId, name: tableId, columns: [], ...data } as TableSchema;
            db.tableSchemas.push(newSchema);
            this.writeDb(db);
            return newSchema;
        }
    }

    async getTableViews(tableId: string): Promise<TableView[]> {
        const db = this.readDb();
        return (db.tableViews || []).filter(v => v.tableId === tableId);
    }

    async getTableView(viewId: string): Promise<TableView | null> {
        const db = this.readDb();
        return (db.tableViews || []).find(v => v.id === viewId) || null;
    }

    async saveTableView(data: TableView): Promise<TableView> {
        const db = this.readDb();
        if (!db.tableViews) db.tableViews = [];
        const idx = db.tableViews.findIndex(v => v.id === data.id);
        if (idx >= 0) {
            db.tableViews[idx] = data;
        } else {
            db.tableViews.push(data);
        }
        this.writeDb(db);
        return data;
    }

    async deleteTableView(viewId: string): Promise<void> {
        const db = this.readDb();
        if (!db.tableViews) return;
        db.tableViews = db.tableViews.filter(v => v.id !== viewId);
        this.writeDb(db);
    }

    async getUserTablePreference(userId: string, tableId: string): Promise<UserViewPreference | null> {
        const db = this.readDb();
        return (db.userPreferences || []).find(p => p.userId === userId && p.tableId === tableId) || null;
    }

    async saveUserTablePreference(userId: string, tableId: string, data: Partial<UserViewPreference>): Promise<UserViewPreference> {
        const db = this.readDb();
        if (!db.userPreferences) db.userPreferences = [];
        const idx = db.userPreferences.findIndex(p => p.userId === userId && p.tableId === tableId);

        if (idx >= 0) {
            db.userPreferences[idx] = { ...db.userPreferences[idx], ...data };
            this.writeDb(db);
            return db.userPreferences[idx];
        } else {
            const newPref: UserViewPreference = {
                userId,
                tableId,
                defaultViewId: data.defaultViewId || 'default'
            };
            db.userPreferences.push(newPref);
            this.writeDb(db);
            return newPref;
        }
    }

    async countConfirmedCases(appointmentId: string): Promise<number> {
        const db = this.readDb();
        return db.cases.filter(c => c.appointmentId === appointmentId && c.statusId === 'os-ready').length;
    }

    // Logs
    async createAuditLog(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
        const log: AuditLog = { ...data, id: Math.random().toString(), createdAt: new Date().toISOString() };
        return log;
    }

    async createWebhookLog(data: Omit<WebhookLog, 'id' | 'createdAt' | 'eventId'>): Promise<WebhookLog> {
        const db = this.readDb();
        const newLog: WebhookLog = {
            ...data,
            id: crypto.randomUUID(),
            eventId: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            status: 'PENDING'
        };
        db.webhookLogs = db.webhookLogs || [];
        db.webhookLogs.push(newLog);
        this.writeDb(db);
        return newLog;
    }

    async getWebhookLogs(filter?: { status?: string }): Promise<WebhookLog[]> {
        const db = this.readDb();
        if (!db.webhookLogs) return [];
        let res = db.webhookLogs;
        if (filter?.status) res = res.filter((l: any) => l.status === filter.status);
        return res;
    }

    async updateWebhookLog(id: string, data: Partial<WebhookLog>): Promise<WebhookLog> {
        const db = this.readDb();
        if (!db.webhookLogs) throw new Error("No webhook logs found");
        const index = db.webhookLogs.findIndex((l: any) => l.id === id);
        if (index === -1) throw new Error("Log not found");
        db.webhookLogs[index] = { ...db.webhookLogs[index], ...data };
        this.writeDb(db);
        return db.webhookLogs[index];
    }

    // Amendment Requests
    async createAmendmentRequest(data: Omit<AmendmentRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<AmendmentRequest> {
        const db = this.readDb();
        const now = new Date().toISOString();
        const req: AmendmentRequest = {
            id: `amend-${Math.random().toString(36).substring(7)}`,
            ...data,
            createdAt: now,
            updatedAt: now
        };
        if (!db.amendmentRequests) db.amendmentRequests = [];
        db.amendmentRequests.push(req);
        this.writeDb(db);
        return req;
    }

    async getAmendmentRequests(filter?: { status?: string; caseId?: string }): Promise<AmendmentRequest[]> {
        const db = this.readDb();
        let res = db.amendmentRequests || [];
        if (filter?.status) res = res.filter(r => r.status === filter.status);
        if (filter?.caseId) res = res.filter(r => r.caseId === filter.caseId);
        return res;
    }

    async updateAmendmentRequest(id: string, data: Partial<AmendmentRequest>): Promise<AmendmentRequest> {
        const db = this.readDb();
        const idx = (db.amendmentRequests || []).findIndex(r => r.id === id);
        if (idx === -1) throw new Error("Not found");
        const updated = { ...db.amendmentRequests![idx], ...data, updatedAt: new Date().toISOString() };
        db.amendmentRequests![idx] = updated;
        this.writeDb(db);
        return updated;
    }

    // Countries
    async getCountries(activeOnly?: boolean): Promise<Country[]> {
        const db = this.readDb();
        let list = db.countries || [];
        if (activeOnly) list = list.filter(c => c.is_active);
        return list;
    }

    async createCountry(data: Omit<Country, 'id' | 'is_active'>): Promise<Country> {
        const db = this.readDb();
        const newCountry = { id: `c-${Math.random().toString(36).substring(7)}`, ...data, is_active: true };
        db.countries.push(newCountry);
        this.writeDb(db);
        return newCountry;
    }

    async updateCountry(id: string, data: Partial<Country>): Promise<Country> {
        const db = this.readDb();
        const idx = db.countries.findIndex(c => c.id === id);
        if (idx === -1) throw new Error("Not found");
        db.countries[idx] = { ...db.countries[idx], ...data };
        this.writeDb(db);
        return db.countries[idx];
    }

    async deleteCountry(id: string): Promise<void> {
        const db = this.readDb();
        const idx = db.countries.findIndex(c => c.id === id);
        if (idx !== -1) {
            db.countries[idx].is_active = false;
            this.writeDb(db);
        }
    }

    // Locations
    async getLocations(includeInactive?: boolean): Promise<Location[]> {
        const db = this.readDb();
        let locs = db.locations || [];
        if (!includeInactive) locs = locs.filter(l => l.is_active);
        return locs;
    }

    async createLocation(data: Omit<Location, 'id' | 'is_active'>): Promise<Location> {
        const db = this.readDb();
        const newLocation = { id: `l-${Math.random().toString(36).substring(7)}`, ...data, is_active: true };
        db.locations.push(newLocation);
        this.writeDb(db);
        return newLocation;
    }

    async updateLocation(id: string, data: Partial<Location>): Promise<Location> {
        const db = this.readDb();
        const idx = db.locations.findIndex(l => l.id === id);
        if (idx === -1) throw new Error("Not found");
        db.locations[idx] = { ...db.locations[idx], ...data };
        this.writeDb(db);
        return db.locations[idx];
    }

    async deleteLocation(id: string): Promise<void> {
        const db = this.readDb();
        const idx = db.locations.findIndex(l => l.id === id);
        if (idx !== -1) {
            db.locations[idx].is_active = false;
            this.writeDb(db);
        }
    }

    // Pricing
    async getPriceBooks(countryId?: string): Promise<PriceBook[]> {
        const db = this.readDb();
        let list = db.priceBooks || [];
        if (countryId) list = list.filter(pb => pb.countryId === countryId);
        return list;
    }

    async createPriceBook(data: Omit<PriceBook, 'id' | 'createdAt' | 'updatedAt'>): Promise<PriceBook> {
        const db = this.readDb();
        const now = new Date().toISOString();
        const pb: PriceBook = { id: `pb-${Math.random().toString(36).substring(7)}`, ...data, createdAt: now, updatedAt: now };
        db.priceBooks.push(pb);
        this.writeDb(db);
        return pb;
    }

    async updatePriceBook(id: string, data: Partial<PriceBook>): Promise<PriceBook> {
        const db = this.readDb();
        const idx = db.priceBooks.findIndex(pb => pb.id === id);
        if (idx === -1) throw new Error("Not found");
        db.priceBooks[idx] = { ...db.priceBooks[idx], ...data, updatedAt: new Date().toISOString() };
        this.writeDb(db);
        return db.priceBooks[idx];
    }

    async deletePriceBook(id: string): Promise<void> {
        const db = this.readDb();
        db.priceBooks = db.priceBooks.filter(pb => pb.id !== id);
        this.writeDb(db);
    }

    async getPriceOverrides(scope?: 'CITY' | 'APPOINTMENT', relatedId?: string): Promise<PriceOverride[]> {
        const db = this.readDb();
        let res = db.priceOverrides || [];
        if (scope === 'CITY') res = res.filter(o => o.scope === 'CITY' && o.locationId === relatedId);
        if (scope === 'APPOINTMENT') res = res.filter(o => o.scope === 'APPOINTMENT' && o.appointmentId === relatedId);
        return res;
    }

    async createPriceOverride(data: Omit<PriceOverride, 'id' | 'createdAt' | 'updatedAt'>): Promise<PriceOverride> {
        const db = this.readDb();
        const now = new Date().toISOString();
        const o: PriceOverride = { id: `ov-${Math.random().toString(36).substring(7)}`, ...data, createdAt: now, updatedAt: now };
        if (!db.priceOverrides) db.priceOverrides = [];
        db.priceOverrides.push(o);
        this.writeDb(db);
        return o;
    }

    async updatePriceOverride(id: string, data: Partial<PriceOverride>): Promise<PriceOverride> {
        const db = this.readDb();
        const idx = (db.priceOverrides || []).findIndex(o => o.id === id);
        if (idx === -1) throw new Error("Not found");
        const updated = { ...db.priceOverrides![idx], ...data, updatedAt: new Date().toISOString() };
        db.priceOverrides![idx] = updated;
        this.writeDb(db);
        return updated;
    }

    async deletePriceOverride(id: string): Promise<void> {
        const db = this.readDb();
        const override = (db.priceOverrides || []).find(o => o.id === id);
        if (override) {
            override.is_deleted = true;
            override.is_active = false;
            override.updatedAt = new Date().toISOString();
            this.writeDb(db);
        }
    }

    async resolveUnitPrices(appointmentId: string): Promise<ParsedPricing> {
        const db = this.readDb();
        const app = db.appointments.find(a => a.id === appointmentId);
        if (!app) throw new Error("Appointment not found");

        let priceBook = app.priceBookId
            ? db.priceBooks.find(pb => pb.id === app.priceBookId)
            : db.priceBooks.find(pb => pb.countryId === app.countryId && pb.is_default_for_country && pb.is_active);

        if (!priceBook) {
            priceBook = db.priceBooks.find(pb => pb.countryId === app.countryId && pb.is_active);
        }

        if (!priceBook) throw new Error(`No active price book found for country: ${app.countryId}`);

        let prices = {
            normal: {
                adult: priceBook.normal_adult_price,
                child: priceBook.normal_child_price,
                infant: priceBook.normal_infant_price,
            },
            vip: {
                adult: priceBook.vip_adult_price,
                child: priceBook.vip_child_price,
                infant: priceBook.vip_infant_price,
            }
        };

        const appliedOverrideIds: string[] = [];
        const cityOverrides = (db.priceOverrides || []).filter(o =>
            !o.is_deleted && o.is_active && o.scope === 'CITY' && o.locationId === app.locationId && o.countryId === app.countryId
        );
        const appOverrides = (db.priceOverrides || []).filter(o =>
            !o.is_deleted && o.is_active && o.scope === 'APPOINTMENT' && o.appointmentId === app.id
        );

        const allOverrides = [...cityOverrides, ...appOverrides];

        for (const override of allOverrides) {
            const seatTypes = override.seatType === 'ALL' ? ['normal', 'vip'] as const : [override.seatType.toLowerCase() as 'normal' | 'vip'];
            const paxTypes = override.passengerType === 'ALL' ? ['adult', 'child', 'infant'] as const : [override.passengerType.toLowerCase() as 'adult' | 'child' | 'infant'];

            let applied = false;
            seatTypes.forEach(s => {
                paxTypes.forEach(p => {
                    const original = prices[s][p];
                    let modified = original;

                    if (override.modifierType === 'FIXED_PRICE') {
                        modified = override.value;
                    } else if (override.modifierType === 'DISCOUNT_AMOUNT') {
                        modified = Math.max(0, original - override.value);
                    } else if (override.modifierType === 'DISCOUNT_PERCENT') {
                        modified = original * (1 - override.value / 100);
                    }

                    if (modified !== original) {
                        prices[s][p] = Math.round(modified);
                        applied = true;
                    }
                });
            });

            if (applied) appliedOverrideIds.push(override.id);
        }

        return {
            currency: priceBook.currency,
            priceBookId: priceBook.id,
            appliedOverrideIds,
            normal: prices.normal,
            vip: prices.vip
        };
    }
}
