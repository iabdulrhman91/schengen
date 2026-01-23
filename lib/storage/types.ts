export type Role = 'MASTER_ADMIN' | 'ADMIN' | 'VISA_MANAGER' | 'EMPLOYEE' | 'AGENCY_MANAGER' | 'AGENCY_USER';

export type Permission =
    // User & Agency Management
    | 'MANAGE_ALL_USERS'
    | 'MANAGE_AGENCIES'
    | 'VIEW_ALL_AGENCIES'
    | 'MANAGE_AGENCY_CREDIT'

    // Operational Core
    | 'MANAGE_MASTER_APPOINTMENTS'    // Create/Edit Appointments
    | 'VIEW_ALL_CASES'                // See cases from all agencies
    | 'MANAGE_ALL_CASES'              // Edit cases from all agencies
    | 'DELETE_CASES'

    // Financial & Pricing
    | 'MANAGE_PRICING_BOOKS'
    | 'MANAGE_PRICE_OVERRIDES'
    | 'VIEW_FINANCIAL_REPORTS'

    // System
    | 'MANAGE_SYSTEM_SETTINGS'
    | 'VIEW_AUDIT_LOGS'
    | 'MANAGE_ROLES';

export interface SystemSettings {
    id: string; // usually 'default'
    maintenanceMode: boolean;
    allowAgencyRegistration: boolean;
    globalAnnouncement?: string;
    allowedCurrencies: string[];
    defaultCommissionRate: number;
}

export interface User {
    id: string;
    username: string;
    password: string; // Mock only
    name: string;
    role: Role;
    agencyId?: string;
    isActive: boolean;
    isDeleted?: boolean;
    createdAt?: string;
}

export interface Agency {
    id: string;
    name: string;
    type: 'OWNER' | 'PARTNER';
    isActive: boolean;
    credit: number;
    createdAt: string;
    updatedAt: string;
    isDeleted?: boolean;
}

export interface Country {
    id: string;
    name_ar: string;
    code: string; // Internal Code (e.g. C-123)
    iso_code?: string; // ISO 3166-1 alpha-2 (e.g. 'es', 'fr', 'sa')
    flag_emoji?: string; // Legacy
    flag_image_url?: string; // Legacy
    is_active: boolean;
    is_deleted?: boolean;
}

export interface Location {
    id: string;
    name_ar: string;
    code: string;
    is_active: boolean;
    is_deleted?: boolean;
}

export interface OperationalStatus {
    id: string;
    label: string;
    color: string; // Hex or CSS class
    isLocked?: boolean; // System statuses (Received, Cancelled)
    sortOrder: number;
}

export type ColumnDataType = 'text' | 'number' | 'date' | 'status' | 'boolean' | 'select' | 'multi-select' | 'person' | 'phone' | 'url';

export interface ColumnSchema {
    id: string; // Logical ID
    key: string; // Data field key
    header: string;
    type: ColumnDataType;
    isCore: boolean;
    filterable: boolean;
    sortable: boolean;
    editable: boolean;
    defaultHidden: boolean;
    width?: number;
    pinned?: 'left' | 'none';
    options?: { label: string; value: string; color?: string }[];
}

export interface TableSchema {
    id: string; // e.g. schengen_passengers
    name: string;
    columns: ColumnSchema[];
}

export type FilterOperator = 'eq' | 'neq' | 'contains' | 'not_contains' | 'gt' | 'lt' | 'is_empty' | 'is_not_empty';

export interface FilterRule {
    columnId: string;
    operator: FilterOperator;
    value: any;
}

export interface FilterGroup {
    conjunction: 'AND' | 'OR';
    rules: (FilterRule | FilterGroup)[];
}

export interface SortRule {
    columnId: string;
    desc: boolean;
}

export interface TableView {
    id: string;
    tableId: string;
    name: string;
    isPublic: boolean;
    createdBy: string;
    filters: FilterGroup;
    sorts: SortRule[];
    columnOrder: string[];
    hiddenColumns: string[];
    pageSize: number;
    density?: 'compact' | 'comfortable';
}

export interface UserViewPreference {
    userId: string;
    tableId: string;
    defaultViewId: string;
}

export interface Appointment {
    id: string;
    code: string;
    countryId: string; // Changed from country string
    locationId: string; // Changed from city string
    date: string; // YYYY-MM-DD
    capacity: number;
    capacity_vip?: number;
    status: 'OPEN' | 'FULL' | 'CANCELLED' | 'COMPLETED';
    priceBookId?: string; // Optional override for base price book
}

export interface Applicant {
    id: string;
    caseId: string;
    type: 'MAIN' | 'DEPENDENT';
    nameInPassport?: string;
    passportNumber?: string;
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
    sponsorship?: string;

    // Operational Fields (for Management Sheet)
    statusId?: string; // Links to OperationalStatus
    biometricsDate?: string;
    biometricsTime?: string;
    biometricsStatus?: 'PENDING' | 'CONFIRMED' | 'DONE';

    // Checkboxes (Messaging)
    msgDocs?: boolean;
    msgAppointment?: boolean;
    msgBiometrics?: boolean;
    msgPassport?: boolean;

    // Checkboxes (Processing)
    appIssued?: boolean;
    appLink?: string;
    insurance?: boolean;
    tickets?: boolean;
    hotel?: boolean;
}

export interface Case {
    id: string;
    fileNumber: string;
    agencyId: string;
    createdById?: string; // Links to the employee
    createdBy?: string;   // Employee name for quick display
    phone?: string;       // Primary contact phone
    appointmentId?: string; // Optional (Waitlist first)

    // Statuses
    travelDate: string;
    returnDate: string;
    lockStatus: 'DRAFT' | 'SUBMITTED' | 'EDIT_OPEN';
    statusId: string; // Dynamic status
    applicants: Applicant[];

    // Pricing Snapshot
    // Pricing Snapshot
    pricingSnapshot?: {
        pricingVersion: number;
        countryCode: string;
        centerId: string;
        appointmentId: string;
        seatType: 'NORMAL' | 'VIP';
        counts: { adult: number; child: number; infant: number };
        unitPrices: {
            normal: { adult: number; child: number; infant: number };
            vip: { adult: number; child: number; infant: number };
        };
        appliedFrom: {
            basePriceBookId?: string;
            cityOverrideId?: string;
            appointmentOverrideId?: string;
        };
        totals: {
            subtotal: number;
            total: number;
            currency: string;
        };
        createdAt: string;
    };

    createdAt: string;
    updatedAt: string;
}

export interface AuditLog {
    id: string;
    action: string;
    userId: string;
    targetId: string;
    details?: string;
    createdAt: string;
}

export interface WebhookLog {
    id: string;
    eventId: string; // Public UUID for external systems
    event: string;
    payload: string;
    status: 'PENDING' | 'SENT' | 'FAILED';
    createdAt: string;

    // Processing Details
    processedAt?: string;
    providerMessageId?: string;
    errorMessage?: string;
    responsePayload?: string;
}

export interface AmendmentRequest {
    id: string;
    caseId: string;
    type: 'EDIT' | 'CANCEL' | 'RESCHEDULE';
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    details: string;
    requestedBy: string;
    reviewedBy?: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
}

export const MASTER_AGENCY_ID = 'tejwal';

export interface IStorage {
    // Agencies
    getAgencies(): Promise<Agency[]>;
    getAgency(id: string): Promise<Agency | null>;
    createAgency(data: Omit<Agency, 'id'>): Promise<Agency>;
    updateAgency(id: string, data: Partial<Agency>): Promise<Agency>;

    // Users
    getUserByUsername(username: string): Promise<User | null>;
    getUserById(id: string): Promise<User | null>;
    getUsers(): Promise<User[]>;
    createUser(data: Omit<User, 'id' | 'createdAt'>): Promise<User>;
    updateUser(id: string, data: Partial<User>): Promise<User>;

    // Appointments
    getAppointments(): Promise<Appointment[]>;
    getAppointment(id: string): Promise<Appointment | null>;
    createAppointment(data: Omit<Appointment, 'id'>): Promise<Appointment>;
    updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment>;
    deleteAppointment(id: string): Promise<void>;

    // Cases
    getCases(filter?: { agencyId?: string; appointmentId?: string }): Promise<Case[]>;
    getCase(id: string): Promise<Case | null>;
    createCase(data: Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'applicants'>): Promise<Case>;
    updateCase(id: string, data: Partial<Case>): Promise<Case>;
    deleteCase(id: string): Promise<void>;

    // Stats/Logic
    countConfirmedCases(appointmentId: string): Promise<number>;

    // Logs
    createAuditLog(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>;
    createWebhookLog(data: Omit<WebhookLog, 'id' | 'createdAt' | 'eventId'>): Promise<WebhookLog>;
    updateWebhookLog(id: string, data: Partial<WebhookLog>): Promise<WebhookLog>;
    getWebhookLogs(filter?: { status?: string }): Promise<WebhookLog[]>;

    // Amendments
    createAmendmentRequest(data: Omit<AmendmentRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<AmendmentRequest>;
    updateAmendmentRequest(id: string, data: Partial<AmendmentRequest>): Promise<AmendmentRequest>;
    getAmendmentRequests(filter?: { status?: string, caseId?: string }): Promise<AmendmentRequest[]>;

    // Dynamic Data
    getCountries(activeOnly?: boolean): Promise<Country[]>;
    createCountry(data: { name_ar: string, code?: string, iso_code?: string, flag_emoji?: string, flag_image_url?: string }): Promise<Country>;
    updateCountry(id: string, data: Partial<Country>): Promise<Country>;
    deleteCountry(id: string): Promise<void>; // Soft delete

    // Locations
    getLocations(includeInactive?: boolean): Promise<Location[]>;
    createLocation(data: Omit<Location, 'id' | 'is_active'>): Promise<Location>;
    updateLocation(id: string, data: Partial<Location>): Promise<Location>;
    deleteLocation(id: string): Promise<void>;

    // Operational Statuses
    getOperationalStatuses(): Promise<OperationalStatus[]>;
    createOperationalStatus(data: Omit<OperationalStatus, 'id'>): Promise<OperationalStatus>;
    updateOperationalStatus(id: string, data: Partial<OperationalStatus>): Promise<OperationalStatus>;
    deleteOperationalStatus(id: string, migrateToId?: string): Promise<void>;

    // Notion-style Table Engine v2
    getTableSchema(tableId: string): Promise<TableSchema | null>;
    updateTableSchema(tableId: string, data: Partial<TableSchema>): Promise<TableSchema>;

    getTableViews(tableId: string): Promise<TableView[]>;
    getTableView(viewId: string): Promise<TableView | null>;
    saveTableView(data: TableView): Promise<TableView>;
    deleteTableView(viewId: string): Promise<void>;

    getUserTablePreference(userId: string, tableId: string): Promise<UserViewPreference | null>;
    saveUserTablePreference(userId: string, tableId: string, data: Partial<UserViewPreference>): Promise<UserViewPreference>;

    // Pricing
    getPriceBooks(countryId?: string): Promise<PriceBook[]>;
    createPriceBook(data: Omit<PriceBook, 'id' | 'createdAt' | 'updatedAt'>): Promise<PriceBook>;
    updatePriceBook(id: string, data: Partial<PriceBook>): Promise<PriceBook>;
    deletePriceBook(id: string): Promise<void>;

    getPriceOverrides(scope?: 'CITY' | 'APPOINTMENT', relatedId?: string): Promise<PriceOverride[]>;
    createPriceOverride(data: Omit<PriceOverride, 'id' | 'createdAt' | 'updatedAt'>): Promise<PriceOverride>;
    updatePriceOverride(id: string, data: Partial<PriceOverride>): Promise<PriceOverride>;
    deletePriceOverride(id: string): Promise<void>;

    // Pricing Logic
    resolveUnitPrices(appointmentId: string): Promise<ParsedPricing>;
}

export interface PriceBook {
    id: string;
    countryId: string; // Linked to Country
    locationId?: string; // Optional: Linked to Location
    name: string;      // "France Base 2025"
    currency: string;  // "SAR"

    // Base Prices
    normal_adult_price: number;
    normal_child_price: number;
    normal_infant_price: number;

    vip_adult_price: number;
    vip_child_price: number;
    vip_infant_price: number;

    is_active: boolean;
    is_default_for_country: boolean;

    createdAt: string;
    updatedAt: string;
    is_deleted?: boolean;
}

export interface PriceOverride {
    id: string;
    scope: 'CITY' | 'APPOINTMENT';
    countryId: string;
    locationId?: string;     // Required if scope=CITY
    appointmentId?: string;  // Required if scope=APPOINTMENT

    modifierType: 'FIXED_PRICE' | 'DISCOUNT_PERCENT' | 'DISCOUNT_AMOUNT';
    value: number; // The generic value (e.g. 10 for 10% or 10 SAR)

    seatType: 'NORMAL' | 'VIP' | 'ALL';
    passengerType: 'ADULT' | 'CHILD' | 'INFANT' | 'ALL';

    startsAt?: string;
    endsAt?: string;
    is_active: boolean;

    createdAt: string;
    updatedAt: string;
    is_deleted?: boolean;
}

export interface ParsedPricing {
    currency: string;
    priceBookId: string;
    appliedOverrideIds: string[];

    // Final Resolved Unit Prices
    normal: { adult: number; child: number; infant: number };
    vip: { adult: number; child: number; infant: number };
}
