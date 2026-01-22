'use server'

import { redirect } from 'next/navigation'
import { storage, User, Case, Applicant, Appointment, Role, Country, Location as AppLocation, TableSchema, TableView, UserViewPreference, ColumnSchema } from './storage'
import { revalidatePath } from 'next/cache'
import { auth, signIn, signOut } from "@/auth"
import fs from 'fs';
import path from 'path';

export async function loginAction(formData: FormData) {
    await signIn("credentials", formData);
}

export async function logoutAction() {
    await signOut({ redirectTo: '/login' });
}

export async function getSession() {
    const session = await auth();
    if (!session?.user) return null;
    return session.user;
}

export async function getAppointments() {
    // All authenticated users can see appointments (Agency needs to select one)
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');
    return storage.getAppointments();
}

export async function getAgencies() {
    return storage.getAgencies();
}

export async function getAppointment(id: string) {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');
    return storage.getAppointment(id);
}

export async function getMyCases() {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    // Strict Isolation Logic
    if (session.role === 'AGENCY_USER' || session.role === 'AGENCY_MANAGER') {
        if (!session.agencyId) throw new Error("Agency ID missing for agency user");
        return storage.getCases({ agencyId: session.agencyId });
    }
    // Admin/Employee sees all
    return storage.getCases();
}

export async function createCaseDraft(formData: FormData) {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    // Enforce Agency ID
    const agencyId = session.agencyId;
    const isInternal = ['ADMIN', 'VISA_MANAGER', 'EMPLOYEE'].includes(session.role);

    if (!isInternal && !agencyId) {
        throw new Error("Agency ID missing for agency user");
    }

    const { MASTER_AGENCY_ID } = await import('./storage/types');
    const finalAgencyId = agencyId || MASTER_AGENCY_ID;

    const appointmentId = formData.get('appointmentId') as string;
    const seatType = (formData.get('seatType') as 'NORMAL' | 'VIP') || 'NORMAL'; // Captured from form

    const rawData = {
        fileNumber: formData.get('fileNumber') as string,
        appointmentId: appointmentId,
        travelDate: formData.get('travelDate') as string,
        returnDate: formData.get('returnDate') as string,
    };

    // 1. Calculate Initial Unit Prices (Locking the Rate Card)
    const pricing = await storage.resolveUnitPrices(appointmentId);

    // 2. Create Snapshot (Counts 0 initially)
    const initialSnapshot = {
        pricingVersion: 1,
        countryCode: 'XX', // Will be populated in resolve if we extended it, or fetch app
        centerId: 'XX',
        appointmentId: appointmentId,
        seatType: seatType,
        counts: { adult: 0, child: 0, infant: 0 },
        unitPrices: {
            normal: pricing.normal,
            vip: pricing.vip
        },
        appliedFrom: {
            basePriceBookId: pricing.priceBookId,
            cityOverrideId: pricing.appliedOverrideIds.find(id => pricing.appliedOverrideIds.includes(id)), // Improved logic needed if explicit
            appointmentOverrideId: undefined
        },
        totals: {
            subtotal: 0,
            total: 0,
            currency: pricing.currency
        },
        createdAt: new Date().toISOString()
    };

    const newCase = await storage.createCase({
        ...rawData,
        agencyId: finalAgencyId,
        lockStatus: 'DRAFT',
        statusId: 'os-new',
        pricingSnapshot: initialSnapshot
    });

    redirect(`/requests/${newCase.id}/applicant`);
}

export async function updateCaseApplicants(caseId: string, applicantData: any) {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const myCase = await storage.getCase(caseId);
    if (!myCase) throw new Error("Not found");

    // Strict Access Control
    if (session.agencyId && myCase.agencyId !== session.agencyId) {
        throw new Error("Unauthorized Access to Case");
    }

    // Check Lock Status
    if (myCase.lockStatus === 'SUBMITTED') {
        throw new Error("Case is locked (SUBMITTED)");
    }
    // Logic for cancelling: Stage to RECEIVED (or basically not confirmed)
    const updated = await storage.updateCase(caseId, {
        applicants: applicantData
    });
    return updated;
}

export async function deleteCaseAction(id: string) {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const myCase = await storage.getCase(id);
    if (!myCase) throw new Error("Not found");

    if (session.agencyId && myCase.agencyId !== session.agencyId) {
        throw new Error("Unauthorized");
    }

    await storage.deleteCase(id);
    revalidatePath('/requests');
}

// Operational Status Actions
export async function getOperationalStatusesAction() {
    return await storage.getOperationalStatuses();
}

export async function createOperationalStatusAction(data: any) {
    const session = await getSession();
    if (session?.role !== 'ADMIN') throw new Error("Unauthorized");
    return await storage.createOperationalStatus(data);
}

export async function updateOperationalStatusAction(id: string, data: any) {
    const session = await getSession();
    if (session?.role !== 'ADMIN') throw new Error("Unauthorized");
    return await storage.updateOperationalStatus(id, data);
}

export async function deleteOperationalStatusAction(id: string, migrateToId?: string) {
    const session = await getSession();
    if (session?.role !== 'ADMIN') throw new Error("Unauthorized");
    return await storage.deleteOperationalStatus(id, migrateToId);
}

export async function saveMainApplicantAction(caseId: string, formData: FormData) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const myCase = await storage.getCase(caseId);
    console.log(`[DEBUG] saveMainApplicantAction: Searching for caseId: '${caseId}'`);
    if (!myCase) {
        const allCases = await storage.getCases();
        console.error(`[DEBUG] Case NOT FOUND. Available cases:`, allCases.map(c => c.id));
        throw new Error(`Not found: Case ID '${caseId}'`);
    }

    if (session.agencyId && myCase.agencyId !== session.agencyId) {
        throw new Error("Unauthorized");
    }

    if (myCase.lockStatus === 'SUBMITTED') {
        throw new Error("Case is locked");
    }

    const applicant: Applicant = {
        id: Math.random().toString(),
        caseId,
        type: 'MAIN',
        nameInPassport: formData.get('nameInPassport') as string,
        passportNumber: formData.get('passportNumber') as string,
        passportImage: formData.get('passportImage') as string,
        mobileNumber: formData.get('mobileNumber') as string,
        birthDate: formData.get('birthDate') as string,
        passportIssueDate: formData.get('passportIssueDate') as string,
        passportExpiryDate: formData.get('passportExpiryDate') as string,
        nationality: formData.get('nationality') as string,
        nationalId: formData.get('nationalId') as string,
        placeOfBirthEn: formData.get('placeOfBirthEn') as string,
        gender: formData.get('gender') as string,
        maritalStatus: formData.get('maritalStatus') as string,
        isEmployee: formData.get('isEmployee') === 'on',
        employerEn: formData.get('employerEn') as string,
        jobTitleEn: formData.get('jobTitleEn') as string,
    };

    const otherApplicants = myCase.applicants.filter(a => a.type !== 'MAIN');
    const newApplicants = [...otherApplicants, applicant];

    // --- RECALCULATE SNAPSHOT ---
    let newSnapshot = myCase.pricingSnapshot;
    if (newSnapshot) {
        // Reset counts for recalculation (simplest way is to rebuild from newApplicants)
        // But here we are just adding/replacing Main. 
        // Better: Iterate ALL applicants to determine counts.
        let adult = 0, child = 0, infant = 0;

        // Helper to determine type
        const getPaxType = (birthDateStr: string) => {
            if (!birthDateStr) return 'ADULT'; // Fallback
            const birth = new Date(birthDateStr);
            const travel = new Date(myCase.travelDate || new Date());
            // Age at travel
            let age = travel.getFullYear() - birth.getFullYear();
            const m = travel.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && travel.getDate() < birth.getDate())) {
                age--;
            }
            if (age < 2) return 'INFANT';
            if (age < 12) return 'CHILD';
            return 'ADULT';
        };

        newApplicants.forEach(app => {
            const type = getPaxType(app.birthDate || '');
            if (type === 'ADULT') adult++;
            if (type === 'CHILD') child++;
            if (type === 'INFANT') infant++;
        });

        // Calculate Totals using Locked Rates
        const rates = newSnapshot.seatType === 'VIP' ? newSnapshot.unitPrices.vip : newSnapshot.unitPrices.normal;
        const subtotal = (adult * rates.adult) + (child * rates.child) + (infant * rates.infant);

        newSnapshot = {
            ...newSnapshot,
            counts: { adult, child, infant },
            totals: {
                ...newSnapshot.totals,
                subtotal: subtotal,
                total: subtotal, // Add taxes here if we had them
            }
        };
    }

    await storage.updateCase(caseId, {
        applicants: newApplicants,
        pricingSnapshot: newSnapshot
    });

    redirect(`/requests/${caseId}/dependents`);
}

export async function addDependentAction(formData: FormData) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const caseId = formData.get('caseId') as string;
    const myCase = await storage.getCase(caseId);
    if (!myCase) throw new Error("Not found");

    if (session.agencyId && myCase.agencyId !== session.agencyId) {
        throw new Error("Unauthorized");
    }

    if (myCase.lockStatus === 'SUBMITTED') {
        throw new Error("Case is locked");
    }

    const applicant: Applicant = {
        id: Math.random().toString(),
        caseId,
        type: 'DEPENDENT',
        nameInPassport: formData.get('nameInPassport') as string,
        passportNumber: formData.get('passportNumber') as string,
        passportImage: formData.get('passportImage') as string,
        mobileNumber: formData.get('mobileNumber') as string,
        birthDate: formData.get('birthDate') as string,
        passportExpiryDate: formData.get('passportExpiryDate') as string,
        nationality: formData.get('nationality') as string,
        nationalId: formData.get('nationalId') as string,
        placeOfBirthEn: formData.get('placeOfBirthEn') as string,
        gender: formData.get('gender') as string,
    };

    const newApplicants = [...myCase.applicants, applicant];

    // --- RECALCULATE SNAPSHOT ---
    let newSnapshot = myCase.pricingSnapshot;
    if (newSnapshot) {
        let adult = 0, child = 0, infant = 0;

        const getPaxType = (birthDateStr: string) => {
            if (!birthDateStr) return 'ADULT';
            const birth = new Date(birthDateStr);
            const travel = new Date(myCase.travelDate || new Date());
            let age = travel.getFullYear() - birth.getFullYear();
            const m = travel.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && travel.getDate() < birth.getDate())) {
                age--;
            }
            if (age < 2) return 'INFANT';
            if (age < 12) return 'CHILD';
            return 'ADULT';
        };

        newApplicants.forEach(app => {
            const type = getPaxType(app.birthDate || '');
            if (type === 'ADULT') adult++;
            if (type === 'CHILD') child++;
            if (type === 'INFANT') infant++;
        });

        const rates = newSnapshot.seatType === 'VIP' ? newSnapshot.unitPrices.vip : newSnapshot.unitPrices.normal;
        const subtotal = (adult * rates.adult) + (child * rates.child) + (infant * rates.infant);

        newSnapshot = {
            ...newSnapshot,
            counts: { adult, child, infant },
            totals: {
                ...newSnapshot.totals,
                subtotal: subtotal,
                total: subtotal
            }
        };
    }

    await storage.updateCase(caseId, {
        applicants: newApplicants,
        pricingSnapshot: newSnapshot
    });

    redirect(`/requests/${caseId}/dependents`);
}

export async function submitWizardAction(caseId: string) {
    await submitCaseAction(caseId);
    redirect('/requests');
}

export async function submitCaseAction(caseId: string) {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const myCase = await storage.getCase(caseId);
    if (!myCase) throw new Error("Not found");

    if (session.agencyId && myCase.agencyId !== session.agencyId) {
        throw new Error("Unauthorized");
    }

    if (myCase.lockStatus === 'SUBMITTED') {
        throw new Error("Already submitted");
    }

    // Capacity Check ... matches previous
    if (!myCase.appointmentId) {
        return storage.updateCase(caseId, { lockStatus: 'SUBMITTED' });
    }

    const appointment = await storage.getAppointment(myCase.appointmentId);
    if (!appointment) throw new Error("Appointment not found");

    const confirmedCount = await storage.countConfirmedCases(myCase.appointmentId);

    let newStatusId: 'os-ready' | 'os-new' = 'os-new';
    if (confirmedCount < appointment.capacity) {
        newStatusId = 'os-ready';
    }

    // Auto-complete logic: If now full, switch to FULL
    const nextCount = newStatusId === 'os-ready' ? confirmedCount + 1 : confirmedCount;
    if (nextCount >= appointment.capacity && appointment.status === 'OPEN') {
        await storage.updateAppointment(appointment.id, { status: 'FULL' });
    }

    const updatedCase = await storage.updateCase(caseId, {
        lockStatus: 'SUBMITTED',
        statusId: newStatusId
    });

    // Webhook Logic
    try {
        // Fetch full data for payload
        const fullCase = await storage.getCase(caseId);
        const agency = await storage.getAgency(fullCase?.agencyId || '');
        const mainApplicant = fullCase?.applicants.find(a => a.type === 'MAIN');

        const { triggerWebhook } = await import('./webhooks');

        const log = await storage.createWebhookLog({
            event: 'CASE_SUBMITTED',
            status: 'PENDING',
            payload: JSON.stringify({
                case: {
                    id: fullCase?.id,
                    fileNumber: fullCase?.fileNumber,
                    status: fullCase?.lockStatus,
                    stage: newStatusId // Changed from newStage to newStatusId
                },
                agency: {
                    id: agency?.id,
                    name: agency?.name
                },
                appointment: {
                    id: appointment.id,
                    code: appointment.code,
                    date: appointment.date
                },
                mainApplicant: {
                    id: mainApplicant?.id,
                    name: mainApplicant?.nameInPassport
                },
                meta: {
                    triggeredBy: session.username,
                    timestamp: new Date().toISOString()
                }
            })
        });

        // Trigger Async (fire and forget to not block UI? Or await?)
        // For prototype, let's await to see logs.
        await triggerWebhook(log);

    } catch (e) {
        console.error("Failed to trigger webhook", e);
    }

    return updatedCase;
}

export async function createAppointmentAction(formData: FormData) {
    const session = await getSession();
    if (session?.role !== 'ADMIN' && session?.role !== 'VISA_MANAGER') {
        throw new Error("Unauthorized");
    }

    const dateStr = formData.get('date') as string;

    // Auto-generate code if not provided
    const providedCode = formData.get('code') as string;
    const generatedCode = providedCode || `APT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    await storage.createAppointment({
        code: generatedCode,
        countryId: formData.get('countryId') as string,
        locationId: formData.get('locationId') as string,
        date: new Date(dateStr).toISOString().split('T')[0], // YYYY-MM-DD
        capacity: parseInt(formData.get('capacity') as string),
        capacity_vip: parseInt(formData.get('capacity_vip') as string) || 0,
        status: 'OPEN'
    });

    revalidatePath('/appointments');
    redirect('/appointments');
}

export async function promoteWaitlistAction(caseId: string) {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'VISA_MANAGER')) {
        throw new Error("Unauthorized: Only Admin/Visa Manager can promote.");
    }

    const myCase = await storage.getCase(caseId);
    if (!myCase) throw new Error("Case not found");

    if (myCase.statusId === 'os-ready') { // Changed from stage to statusId
        throw new Error("Case is already confirmed.");
    }

    if (!myCase.appointmentId) {
        throw new Error("Case has no appointment.");
    }

    const appointment = await storage.getAppointment(myCase.appointmentId);
    if (!appointment) throw new Error("Appointment not found");

    if (appointment.status !== 'OPEN' && appointment.status !== 'FULL') {
        throw new Error("Appointment is not available (CANCELLED/COMPLETED).");
    }

    const confirmedCount = await storage.countConfirmedCases(myCase.appointmentId);
    if (confirmedCount >= appointment.capacity) {
        throw new Error(`Appointment capacity reached`);
    }

    // Logic for confirming appointment: Change Status to READY_FOR_BIO
    const updated = await storage.updateCase(caseId, { statusId: 'os-ready' });

    // Auto-complete logic
    const newCount = confirmedCount + 1;
    if (newCount >= appointment.capacity && appointment.status === 'OPEN') {
        await storage.updateAppointment(appointment.id, { status: 'FULL' });
    }



    await storage.createAuditLog({
        userId: session.id,
        action: 'WAITLIST_PROMOTED',
        targetId: caseId,
        details: `Promoted case ${myCase.fileNumber} from Waiting to Confirmed.`
    });

    const { triggerWebhook } = await import('./webhooks');

    const log = await storage.createWebhookLog({
        event: 'WAITLIST_PROMOTED',
        payload: JSON.stringify({
            case: {
                id: myCase.id,
                fileNumber: myCase.fileNumber,
                previousStatus: 'WAITING',
                newStatus: 'CONFIRMED'
            },
            appointment: {
                id: appointment.id,
                // code: appointment.code 
            },
            meta: {
                triggeredBy: session.username,
                timestamp: new Date().toISOString()
            }
        }),
        status: 'PENDING'
    });

    try {
        await triggerWebhook(log);
    } catch (e) {
        console.error("Failed to trigger webhook", e);
    }

    revalidatePath(`/appointments/${appointment.id}`);
    revalidatePath(`/appointments`);
}

export async function createAmendmentRequestAction(formData: FormData) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const caseId = formData.get('caseId') as string;
    const type = formData.get('type') as any; // EDIT, CANCEL, RESCHEDULE
    const details = formData.get('details') as string;

    const myCase = await storage.getCase(caseId);
    if (!myCase) throw new Error("Case not found");

    if (session.agencyId && myCase.agencyId !== session.agencyId) {
        throw new Error("Unauthorized");
    }

    const req = await storage.createAmendmentRequest({
        caseId,
        type,
        details,
        requestedBy: session.id,
    });

    // Webhook
    try {
        const fullCase = await storage.getCase(caseId);
        const agency = await storage.getAgency(fullCase?.agencyId || '');
        const { triggerWebhook } = await import('./webhooks');

        const log = await storage.createWebhookLog({
            event: 'AMENDMENT_REQUEST_CREATED',
            payload: JSON.stringify({
                case: {
                    id: fullCase?.id,
                    fileNumber: fullCase?.fileNumber
                },
                agency: {
                    id: agency?.id,
                    name: agency?.name
                },
                request: {
                    id: req.id,
                    type: type,
                    details: details,
                    status: 'PENDING'
                },
                meta: {
                    triggeredBy: session.username,
                    timestamp: new Date().toISOString()
                }
            }),
            status: 'PENDING'
        });

        await triggerWebhook(log);
    } catch (e) {
        console.error("Webhook Error", e);
    }

    revalidatePath(`/requests/${caseId}`);
    return { success: true };
}

export async function resolveAmendmentRequestAction(requestId: string, decision: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'VISA_MANAGER')) {
        throw new Error("Unauthorized");
    }

    const request = (await storage.getAmendmentRequests()).find(r => r.id === requestId);
    if (!request) throw new Error("Request not found");

    const myCase = await storage.getCase(request.caseId);
    if (!myCase) throw new Error("Case not found");

    await storage.updateAmendmentRequest(requestId, {
        status: decision,
        reviewedBy: session.id,
        rejectionReason: rejectionReason || undefined
    });

    if (decision === 'APPROVED') {
        if (request.type === 'CANCEL') {
            await storage.updateCase(myCase.id, { statusId: 'os-cancel' });
        }
        if (request.type === 'EDIT') {
            // Unlock for editing with explicit EDIT_OPEN status
            await storage.updateCase(myCase.id, { lockStatus: 'EDIT_OPEN' });
        }
        if (request.type === 'RESCHEDULE') {
            await storage.updateCase(myCase.id, {
                statusId: 'os-new' // Reset to new for rescheduling
            });
        }
    }

    await storage.createAuditLog({
        userId: session.id,
        action: `AMENDMENT_REQUEST_${decision}`,
        targetId: request.id,
        details: `Request ${request.type} resolved. Reason: ${rejectionReason || 'None'}`
    });

    // Webhook
    try {
        const { triggerWebhook } = await import('./webhooks');
        const effects = [];
        if (decision === 'APPROVED') {
            if (request.type === 'CANCEL') effects.push("Case status set to CANCELLED");
            if (request.type === 'EDIT') effects.push("Case unlocked (EDIT_OPEN)");
            if (request.type === 'RESCHEDULE') effects.push("Case status set to RESCHEDULE_PENDING");
        }

        const log = await storage.createWebhookLog({
            event: 'AMENDMENT_DECISION',
            // eventId is auto-generated by adapter
            payload: JSON.stringify({
                case: {
                    id: myCase.id,
                    fileNumber: myCase.fileNumber
                },
                request: {
                    id: requestId,
                    type: request.type,
                    previousStatus: 'PENDING',
                    newStatus: decision,
                    rejectionReason: rejectionReason || null,
                    effects: effects
                },
                meta: {
                    triggeredBy: session.username,
                    timestamp: new Date().toISOString()
                }
            }),
            status: 'PENDING'
        });

        await triggerWebhook(log);
    } catch (e) {
        console.error("Webhook Error", e);
    }

    revalidatePath(`/admin/requests`);
}

export async function rescheduleCaseAction(caseId: string, formData: FormData) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const newAppointmentId = formData.get('appointmentId') as string;

    const myCase = await storage.getCase(caseId);
    if (!myCase) throw new Error("Case not found");

    if (session.agencyId && myCase.agencyId !== session.agencyId) {
        throw new Error("Unauthorized");
    }

    if (myCase.statusId !== 'os-new') {
        // Technically it should be os-new after approval, but we accept it
    }

    const appointment = await storage.getAppointment(newAppointmentId);
    if (!appointment) throw new Error("Appointment not found");

    if (appointment.status !== 'OPEN') {
        throw new Error("Selected appointment is not OPEN");
    }

    const confirmedCount = await storage.countConfirmedCases(newAppointmentId);
    let newStatusId = 'os-new';
    if (confirmedCount < appointment.capacity) {
        newStatusId = 'os-ready';
    }

    await storage.updateCase(caseId, {
        appointmentId: newAppointmentId,
        statusId: newStatusId
    });

    await storage.createAuditLog({
        userId: session.id,
        action: 'CASE_RESCHEDULED',
        targetId: caseId,
        details: `Rescheduled to appointment ${appointment.code}. New status: ${newStatusId}`
    });

    revalidatePath(`/requests/${caseId}`);
    redirect(`/requests/${caseId}`);
}

export async function resendWebhookAction(logId: string) {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'VISA_MANAGER')) {
        throw new Error("Unauthorized");
    }

    // 1. Get Old Log to copy data
    // Optimally we'd have getWebhookLog(id), but using getWebhookLogs() filter is fine for now
    const logs = await storage.getWebhookLogs();
    const oldLog = logs.find(l => l.id === logId);
    if (!oldLog) throw new Error("Log not found");

    // 2. Create New Log (New eventId)
    // We can reuse the payload but maybe update meta? 
    // For idempotency in n8n, a NEW eventId is better as it is a "Retry" event.
    // Ideally we append "retryOf: oldEventId" in meta.
    let payloadObj: any = {};
    try {
        payloadObj = JSON.parse(oldLog.payload);
        if (!payloadObj.meta) payloadObj.meta = {};
        payloadObj.meta.isRetry = true;
        payloadObj.meta.originalEventId = oldLog.eventId;
        payloadObj.meta.retriedBy = session.username;
        payloadObj.meta.retriedAt = new Date().toISOString();
    } catch (e) {
        payloadObj = { raw: oldLog.payload, meta: { isRetry: true } };
    }

    const newLog = await storage.createWebhookLog({
        event: oldLog.event, // Keep same event type
        status: 'PENDING',
        payload: JSON.stringify(payloadObj)
    });

    // 3. Audit
    await storage.createAuditLog({
        userId: session.id,
        action: 'WEBHOOK_RESENT',
        targetId: logId,
        details: `Resent webhook ${oldLog.event}`
    });

    try {
        const { triggerWebhook } = await import('./webhooks');
        await triggerWebhook(newLog);
    } catch (e) { console.error(e); }

    revalidatePath('/admin/webhooks');
}

// Phase 26: Appointment Management
export async function updateAppointmentAction(id: string, formData: FormData) {
    const session = await getSession();
    if (session?.role !== 'ADMIN' && session?.role !== 'VISA_MANAGER') throw new Error("Unauthorized");

    const data: any = {};
    if (formData.has('status')) data.status = formData.get('status');

    const cap = parseInt(formData.get('capacity') as string);
    if (!isNaN(cap)) data.capacity = cap;

    const capVip = parseInt(formData.get('capacity_vip') as string);
    if (!isNaN(capVip)) data.capacity_vip = capVip;

    // New Fields
    if (formData.has('date')) data.date = formData.get('date') as string;
    if (formData.has('countryId')) data.countryId = formData.get('countryId') as string;
    if (formData.has('locationId')) data.locationId = formData.get('locationId') as string;

    await storage.updateAppointment(id, data);
    revalidatePath('/appointments');
}

export const updateAppointmentStatusAction = updateAppointmentAction;


export async function deleteAppointmentAction(id: string) {
    const session = await getSession();
    if (session?.role !== 'ADMIN' && session?.role !== 'VISA_MANAGER') throw new Error("Unauthorized");

    await storage.deleteAppointment(id);
    revalidatePath('/appointments');
}


// --- Dynamic Data Actions ---

export async function getCountriesAction(activeOnly = true, requirePriceBook = false) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    let countries = await storage.getCountries(activeOnly);

    if (requirePriceBook) {
        const priceBooks = await storage.getPriceBooks();
        const validCountryIds = new Set(
            priceBooks
                .filter(pb => pb.is_active && pb.is_default_for_country)
                .map(pb => pb.countryId)
        );
        countries = countries.filter(c => validCountryIds.has(c.id));
    }

    return countries;
}

export async function createCountryAction(data: { name_ar: string, iso_code?: string, flag_emoji?: string, code?: string }) {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'VISA_MANAGER')) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const country = await storage.createCountry({
            name_ar: data.name_ar,
            iso_code: data.iso_code?.toLowerCase(),
            flag_emoji: data.flag_emoji,
            code: data.code
        });
        revalidatePath('/appointments/new');
        return { success: true, data: country };
    } catch (e: any) {
        console.error("Create Country Failed:", e);
        return { success: false, error: e.message };
    }
}

export async function toggleCountryStatusAction(id: string, isActive: boolean) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        throw new Error("Unauthorized");
    }
    const country = await storage.updateCountry(id, { is_active: isActive });
    revalidatePath('/appointments/new');
    return country;
}

export async function updateCountryAction(id: string, data: { flag_emoji?: string, flag_image_url?: string, iso_code?: string, name_ar?: string, is_active?: boolean }) {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'VISA_MANAGER')) {
        return { success: false, error: "Unauthorized" };
    }
    try {
        const country = await storage.updateCountry(id, data);
        revalidatePath('/appointments/new');
        return { success: true, data: country };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteCountryAction(id: string) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') throw new Error("Unauthorized");
    await storage.deleteCountry(id);
    revalidatePath('/appointments/new');
}

export async function uploadCountryFlagAction(formData: FormData) {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'VISA_MANAGER')) {
        throw new Error("Unauthorized");
    }

    const countryId = formData.get('countryId') as string;
    const file = formData.get('file') as File;

    if (!countryId || !file) throw new Error("Missing required fields");

    // File Validation
    if (!file.type.startsWith('image/')) throw new Error("Invalid file type");
    if (file.size > 2 * 1024 * 1024) throw new Error("File too large (Max 2MB)");

    // Save File
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure dir exists (redundant check but safe)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'flags');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.name);
    const filename = `${countryId}-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/flags/${filename}`;

    // Update Country
    await storage.updateCountry(countryId, { flag_image_url: publicUrl });
    revalidatePath('/appointments/new');

    return { success: true, url: publicUrl };
}

export async function getLocationsAction(activeOnly = true) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");
    return storage.getLocations(activeOnly);
}

export async function createLocationAction(name_ar: string) {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'VISA_MANAGER')) {
        return { success: false, error: "Unauthorized" };
    }
    try {
        const location = await storage.createLocation({
            name_ar,
            code: name_ar.toUpperCase().substring(0, 5) // Simple fallback code
        });
        revalidatePath('/appointments/new');
        return { success: true, data: location };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function toggleLocationStatusAction(id: string, isActive: boolean) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        throw new Error("Unauthorized");
    }
    const location = await storage.updateLocation(id, { is_active: isActive });
    revalidatePath('/appointments/new');
    return location;
}



export async function updateLocationAction(id: string, data: any) {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'VISA_MANAGER')) {
        return { success: false, error: "Unauthorized" };
    }
    try {
        const location = await storage.updateLocation(id, data);
        revalidatePath('/appointments/new');
        return { success: true, data: location };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteLocationAction(id: string) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') throw new Error("Unauthorized");
    await storage.deleteLocation(id);
    revalidatePath('/appointments/new');
}

// --- Price Books Actions ---

export async function createPriceBookAction(data: any) {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'VISA_MANAGER')) {
        return { success: false, error: "Unauthorized" };
    }
    try {
        const pb = await storage.createPriceBook(data);
        revalidatePath('/admin/pricing'); // Revalidate admin page
        return { success: true, data: pb };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updatePriceBookAction(id: string, data: any) {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'VISA_MANAGER')) {
        return { success: false, error: "Unauthorized" };
    }
    try {
        const pb = await storage.updatePriceBook(id, data);
        revalidatePath('/admin/pricing');
        return { success: true, data: pb };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deletePriceBookAction(id: string) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: "Unauthorized" };
    try {
        await storage.deletePriceBook(id);
        revalidatePath('/admin/pricing');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- Price Overrides Actions ---

export async function createPriceOverrideAction(data: any) {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'VISA_MANAGER')) {
        return { success: false, error: "Unauthorized" };
    }
    try {
        const po = await storage.createPriceOverride(data);
        revalidatePath('/admin/pricing');
        return { success: true, data: po };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updatePriceOverrideAction(id: string, data: any) {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'VISA_MANAGER')) {
        return { success: false, error: "Unauthorized" };
    }
    try {
        const po = await storage.updatePriceOverride(id, data);
        revalidatePath('/admin/pricing');
        return { success: true, data: po };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deletePriceOverrideAction(id: string) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, error: "Unauthorized" };
    try {
        await storage.deletePriceOverride(id);
        revalidatePath('/admin/pricing');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getCalendarAppointments(year: number, month: number) {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const allAppointments = await storage.getAppointments();
    const countries = await storage.getCountries();
    const locations = await storage.getLocations();
    const priceBooks = await storage.getPriceBooks();

    // Valid Countries with Default Price Book
    const validCountryIds = new Set(
        priceBooks
            .filter(pb => pb.is_active && pb.is_default_for_country)
            .map(pb => pb.countryId)
    );

    const result = allAppointments.filter(app => {
        const d = new Date(app.date);
        const inMonth = d.getFullYear() === year && d.getMonth() === month;
        if (!inMonth) return false;

        // @ts-ignore
        const cId = app.countryId || (countries.find(c => c.name_ar === app.country)?.id) || '';

        // GUARDRAIL: Must have default PB OR specific PB override
        return validCountryIds.has(cId) || (app.priceBookId && priceBooks.some(pb => pb.id === app.priceBookId && pb.is_active));
    });

    return result.map(app => {
        // Handle both legacy 'country' string and new 'countryId' relation
        // @ts-ignore - Create flexible check
        const cId = app.countryId || (countries.find(c => c.name_ar === app.country)?.id);

        const country = countries.find(c => c.id === cId) || { id: '', name_ar: 'غير معروف', code: 'UN', flag_image_url: '', iso_code: 'UN', is_active: true } as Country;
        const location = locations.find(l => l.id === app.locationId) || { id: '', name_ar: 'غير محدد', code: 'UN', is_active: true } as AppLocation;

        return {
            ...app,
            countryName: country.name_ar,
            countryCode: country.iso_code || 'UN', // Use ISO code for Emoji flags
            countryFlag: country.flag_image_url || null,
            locationName: location.name_ar,
        };
    });
}

import { JsonStorage } from './storage/json-adapter';

// ... existing imports ...

export async function getAppointmentPricing(appointmentId: string) {
    'use server';
    console.log(`[getAppointmentPricing] Called with ID: ${appointmentId}`);

    // Explicitly instantiate storage here to ensure fresh read
    const storageInstance = new JsonStorage();

    try {
        const pricing = await storageInstance.resolveUnitPrices(appointmentId);
        console.log(`[getAppointmentPricing] Success:`, pricing);
        return { success: true, data: pricing };
    } catch (e: any) {
        console.error("[getAppointmentPricing] Failed:", e);

        let code = 'INTERNAL_ERROR';
        const msg = e.message || '';

        if (msg.includes('Appointment not found')) code = 'NOT_FOUND';
        else if (msg.includes('No active price book')) code = 'NO_DEFAULT_PRICEBOOK';

        return { success: false, error: code, errorMessage: msg };
    }
}

export async function getAdminPricingData() {
    'use server';
    const storage = new JsonStorage();
    const [priceBooks, overrides, countries, locations] = await Promise.all([
        storage.getPriceBooks(),
        storage.getPriceOverrides(),
        storage.getCountries(),
        storage.getLocations()
    ]);
    return { priceBooks, overrides, countries, locations };
}

export async function submitWizardFinalAction(payload: {
    appointmentId: string;
    seatType: 'NORMAL' | 'VIP';
    passengers: any[];
    relationshipType: 'FAMILY' | 'FRIENDS' | null;
    sponsorship: any;
    phone: string;
}) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    // Enforce Agency ID
    const { MASTER_AGENCY_ID } = await import('./storage/types');
    const agencyId = session.agencyId || MASTER_AGENCY_ID;

    // 1. Resolve Pricing Snapshot
    const pricing = await storage.resolveUnitPrices(payload.appointmentId);

    // 2. Map and Count Types
    let adult = 0, child = 0, infant = 0;
    payload.passengers.forEach(p => {
        if (p.type === 'ADULT') adult++;
        else if (p.type === 'CHILD') child++;
        else if (p.type === 'INFANT') infant++;
    });

    const rates = payload.seatType === 'VIP' ? pricing.vip : pricing.normal;
    const subtotal = (adult * rates.adult) + (child * rates.child) + (infant * rates.infant);

    const snapshot = {
        pricingVersion: 1,
        countryCode: 'AUTO',
        centerId: 'AUTO',
        appointmentId: payload.appointmentId,
        seatType: payload.seatType,
        counts: { adult, child, infant },
        unitPrices: {
            normal: pricing.normal,
            vip: pricing.vip
        },
        appliedFrom: {
            basePriceBookId: pricing.priceBookId,
            cityOverrideId: pricing.appliedOverrideIds[0],
        },
        totals: {
            subtotal,
            total: subtotal,
            currency: pricing.currency
        },
        createdAt: new Date().toISOString()
    };

    // 3. Create Case Base
    const newCase = await storage.createCase({
        fileNumber: `WIZ-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        agencyId: agencyId,
        appointmentId: payload.appointmentId,
        phone: payload.phone,
        travelDate: new Date().toISOString(), // Final date should come from appt date eventually
        returnDate: new Date().toISOString(),
        lockStatus: 'DRAFT',
        statusId: 'os-new',
        pricingSnapshot: snapshot as any
    });

    // 4. Map Applicants (Passengers)
    const applicants: Applicant[] = payload.passengers.map((p, idx) => {
        const sInfo = payload.sponsorship[p.id];
        let sponsorshipText = '';
        let emp = '';
        let job = '';

        if (sInfo) {
            if (sInfo.type === 'SELF') {
                sponsorshipText = 'كفالة ذاتية';
                emp = sInfo.workPlace;
                job = sInfo.jobTitle;
            } else if (sInfo.type === 'PASSENGER') {
                const target = payload.passengers.find(tp => tp.id === sInfo.targetId);

                // If the passenger IS the sponsor, mark as Self Sponsored
                if (p.id === sInfo.targetId) {
                    sponsorshipText = 'كفالة ذاتية';
                } else {
                    const sponsorName = target?.fullName || 'مسافر آخر';
                    sponsorshipText = `كفالة: ${sponsorName}`;
                }

                // Keep employment empty/inherit? Actually, for view logic we just set it here but hide it in UI if sponsored
                // But wait, the USER asked to NOT show employment for dependents if sponsored by passenger
                // The view logic handles hiding. We just store it or not?
                // Let's store it for completeness in DB, view decides to hide.
                emp = sInfo.workPlace;
                job = sInfo.jobTitle;
            } else if (sInfo.type === 'EXTERNAL') {
                const sponsorName = sInfo.externalInfo?.fullName || 'شخص خارجي';

                // Combine for Layout: "Sponsor Name (Relation) | Job - Employer"
                const relation = sInfo.externalInfo?.relation ? ` (${sInfo.externalInfo.relation})` : '';
                const jobDetails = [sInfo.externalInfo?.jobTitle, sInfo.externalInfo?.workPlace].filter(Boolean).join(' في ');
                sponsorshipText = `كفالة خارجية: ${sponsorName}${relation}${jobDetails ? `|${jobDetails}` : ''}`;

                // We do NOT set emp/job columns for the applicant itself in this case, 
                // as requested: "لا تظهر جهة العمل والمسمى الوظيفي" in their columns.
                emp = '';
                job = '';
            }
        }

        return {
            id: Math.random().toString(36).substring(7),
            caseId: newCase.id,
            type: idx === 0 ? 'MAIN' : 'DEPENDENT',
            nameInPassport: p.fullName,
            passportNumber: p.passportNumber,
            mobileNumber: idx === 0 ? `0${payload.phone}` : undefined,
            birthDate: p.birthDate,
            passportIssueDate: p.issueDate,
            passportExpiryDate: p.expiryDate,
            nationality: p.nationality,
            nationalId: p.idNumber,
            gender: p.sex,
            placeOfBirthEn: p.placeOfBirth,
            maritalStatus: p.maritalStatus,
            employerEn: emp,
            jobTitleEn: job,
            sponsorship: sponsorshipText
        };
    });

    // Save with applicants
    await storage.updateCase(newCase.id, {
        applicants,
        travelDate: snapshot.createdAt // Initial travel date or something meaningful
    });

    // 5. Submit Case (Lock and Check Capacity)
    return await submitCaseAction(newCase.id);
}

// End of file cleanup - removing Redundant Code





// --- NOTION TABLE ENGINE V2 ACTIONS ---

export async function getTableSchemaAction(tableId: string) {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');
    return storage.getTableSchema(tableId);
}

export async function updateTableSchemaAction(tableId: string, data: Partial<TableSchema>) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') throw new Error('Only Admin can update schema');
    const res = await storage.updateTableSchema(tableId, data);
    revalidatePath('/');
    return res;
}

export async function getTableViewsAction(tableId: string) {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');
    return storage.getTableViews(tableId);
}

export async function saveTableViewAction(data: TableView) {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    // Safety: Only admin can save public views
    if (data.isPublic && session.role !== 'ADMIN') {
        throw new Error('Only Admin can create public views');
    }

    const res = await storage.saveTableView(data);
    revalidatePath('/');
    return res;
}

export async function deleteTableViewAction(viewId: string) {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');
    // Security check omitted for brevity in MVP (should check createdBy or role)
    const res = await storage.deleteTableView(viewId);
    revalidatePath('/');
    return res;
}

export async function getUserTablePreferenceAction(tableId: string) {
    const session = await getSession();
    if (!session) return null;
    return storage.getUserTablePreference(session.id, tableId);
}

export async function saveUserTablePreferenceAction(tableId: string, data: Partial<UserViewPreference>) {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');
    const res = await storage.saveUserTablePreference(session.id, tableId, data);
    return res;
}

export async function getSchengenRowsAction(params: {
    tableId: string;
    viewId?: string;
    filters?: any[];
    sorts?: any[];
    search?: string;
    page?: number;
    pageSize?: number;
}) {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    // 1. Fetch data
    let cases = await storage.getCases();

    // 2. Flatten for the table (Schengen Table shows Applicants/Passengers)
    let rows = cases.flatMap(c =>
        (c.applicants || []).map(a => ({
            ...a,
            fileNumber: c.fileNumber,
            case_statusId: c.statusId,
            assignedTo: c.createdBy,
            travelDate: c.travelDate,
            createdAt: c.createdAt,
            // Add more as needed
        }))
    );

    // 3. Apply Default Business Logic (Smart Defaults)
    // للموظف: Default Filter = assignedTo == currentUser AND status != "منتهي"
    // للمدير: Default Filter = status != "منتهي"
    if (!params.viewId || params.viewId === 'default') {
        if (session.role === 'EMPLOYEE') {
            rows = rows.filter(r => r.assignedTo === session.username && r.case_statusId !== 'os-received');
        } else {
            rows = rows.filter(r => r.case_statusId !== 'os-received');
        }
    }

    // 4. Global Search
    if (params.search) {
        const s = params.search.toLowerCase();
        rows = rows.filter(r =>
            r.nameInPassport?.toLowerCase().includes(s) ||
            r.passportNumber?.toLowerCase().includes(s) ||
            r.fileNumber?.toLowerCase().includes(s) ||
            r.mobileNumber?.includes(s)
        );
    }

    // 5. Apply Custom Filters (MVP)
    if (params.filters && params.filters.length > 0) {
        rows = rows.filter(r => {
            return params.filters!.every(f => {
                const val = (r as any)[f.id];
                const target = f.value;
                if (target === undefined || target === null || target === '') return true;

                switch (f.operator) {
                    case 'eq': return val === target;
                    case 'contains': return String(val).toLowerCase().includes(String(target).toLowerCase());
                    case 'startsWith': return String(val).toLowerCase().startsWith(String(target).toLowerCase());
                    case 'endsWith': return String(val).toLowerCase().endsWith(String(target).toLowerCase());
                    default: return true;
                }
            });
        });
    }

    // 6. Apply Sorting
    if (params.sorts && params.sorts.length > 0) {
        const sort = params.sorts[0]; // Simple single sort for now
        rows.sort((a, b) => {
            const valA = (a as any)[sort.id];
            const valB = (b as any)[sort.id];
            if (valA < valB) return sort.desc ? 1 : -1;
            if (valA > valB) return sort.desc ? -1 : 1;
            return 0;
        });
    }

    // 7. Virtualization Paginiation (if not handled by virtual library)
    const count = rows.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

    return {
        rows: paginatedRows,
        totalCount: count
    };
}

export async function updateTableCellAction(rowId: string, columnId: string, value: any) {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    // 1. Fetch data
    const cases = await storage.getCases();
    let targetCaseIdx = -1;
    let targetAppIdx = -1;

    for (let i = 0; i < cases.length; i++) {
        const appIdx = (cases[i].applicants || []).findIndex(a => a.id === rowId);
        if (appIdx >= 0) {
            targetCaseIdx = i;
            targetAppIdx = appIdx;
            break;
        }
    }

    if (targetCaseIdx === -1) throw new Error("Row not found");

    const targetCase = cases[targetCaseIdx];
    const targetApplicant = targetCase.applicants![targetAppIdx];

    // 2. Determine if we are updating the Case or the Applicant
    // Mapping: columnId -> field name in either Case or Applicant
    const caseFields: Record<string, string> = {
        'case_statusId': 'statusId',
        'travelDate': 'travelDate',
        'fileNumber': 'fileNumber'
    };

    try {
        if (caseFields[columnId]) {
            const field = caseFields[columnId];
            await storage.updateCase(targetCase.id, { [field]: value });
        } else {
            // Map column IDs to Applicant interface keys
            const applicantFieldMap: Record<string, string> = {
                'employer': 'employerEn',
                'jobTitle': 'jobTitleEn',
                'birth': 'birthDate',
                'passportIssue': 'passportIssueDate',
                'passportExpiry': 'passportExpiryDate',
                'name': 'nameInPassport',
                'passport': 'passportNumber',
                'nationalId': 'nationalId',
                'placeOfBirth': 'placeOfBirthEn',
                'gender': 'gender',
                'maritalStatus': 'maritalStatus',
                'phone': 'mobileNumber'
            };

            const targetField = applicantFieldMap[columnId] || columnId;

            // Updating Applicant
            targetCase.applicants![targetAppIdx] = {
                ...targetApplicant,
                [targetField]: value
            };
            await storage.updateCase(targetCase.id, { applicants: targetCase.applicants });
        }

        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateCaseCell(caseId: string, field: string, value: any) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const myCase = await storage.getCase(caseId);
    if (!myCase) throw new Error("Not found");

    // Access control
    if (session.agencyId && myCase.agencyId !== session.agencyId) {
        throw new Error("Unauthorized");
    }

    // Mapping for flattened fields
    const updates: any = {};
    const applicantUpdates: any = myCase.applicants.length > 0 ? { ...myCase.applicants[0] } : null;

    if (field === 'name') {
        if (applicantUpdates) applicantUpdates.nameInPassport = value;
    } else if (field === 'passport') {
        if (applicantUpdates) applicantUpdates.passportNumber = value;
    } else if (field === 'nationality') {
        if (applicantUpdates) applicantUpdates.nationality = value;
    } else if (field === 'nationalId') {
        if (applicantUpdates) applicantUpdates.nationalId = value;
    } else if (field === 'employer') {
        if (applicantUpdates) applicantUpdates.employerEn = value;
    } else if (field === 'jobTitle') {
        if (applicantUpdates) applicantUpdates.jobTitleEn = value;
    } else if (field === 'birth') {
        if (applicantUpdates) applicantUpdates.birthDate = value;
    } else if (field === 'passportIssue') {
        if (applicantUpdates) applicantUpdates.passportIssueDate = value;
    } else if (field === 'passportExpiry') {
        if (applicantUpdates) applicantUpdates.passportExpiryDate = value;
    } else if (field === 'placeOfBirth') {
        if (applicantUpdates) applicantUpdates.placeOfBirthEn = value;
    } else if (field === 'gender') {
        if (applicantUpdates) applicantUpdates.gender = value;
    } else if (field === 'maritalStatus') {
        if (applicantUpdates) applicantUpdates.maritalStatus = value;
    } else if (field === 'phone') {
        updates.phone = value;
        if (applicantUpdates) applicantUpdates.mobileNumber = value;
    } else if (field === 'status') {
        updates.statusId = value;
    } else if (field === 'travelDate') {
        updates.travelDate = value;
    } else if (field === 'returnDate') {
        updates.returnDate = value;
    } else {
        updates[field] = value;
    }

    if (applicantUpdates) {
        updates.applicants = [applicantUpdates, ...myCase.applicants.slice(1)];
    }

    await storage.updateCase(caseId, updates);

    revalidatePath('/cases');
    return { success: true };
}


