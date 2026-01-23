'use server';

import { getSession } from "@/lib/actions";
import { storage } from "@/lib/storage";
import { Agency } from "@/lib/storage/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function generatePassword(length = 8) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

export async function createAgencyAction(formData: FormData) {
    const session = await getSession();
    if (session?.role !== 'MASTER_ADMIN') {
        throw new Error("Unauthorized");
    }

    const name = formData.get('name') as string;
    const type = formData.get('type') as 'OWNER' | 'PARTNER';
    const credit = Number(formData.get('credit') || 0);

    const newAgency = await storage.createAgency({
        name,
        type,
        isActive: true,
        credit, // Initial credit
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    // Create a default manager user for this agency
    const defaultUsername = `manager_${Math.random().toString(36).substring(2, 6)}`;
    // In real app, we might email this. For now, we assume standard password or log it.
    // For the "Simulated" nature, let's just create it with '123' hashed.
    // Hash for '123': $2a$10$8iYvO0L5.X6f8oFz8P6PZeM6qFfN0E5K8uUo/G0YhI5n0yA3x6K6u
    await storage.createUser({
        username: defaultUsername,
        password: '$2a$10$8iYvO0L5.X6f8oFz8P6PZeM6qFfN0E5K8uUo/G0YhI5n0yA3x6K6u',
        name: `مدير ${name}`,
        role: 'AGENCY_MANAGER',
        agencyId: newAgency.id
    });

    revalidatePath('/admin/agencies');
    return { success: true, agencyId: newAgency.id };
}

export async function updateAgencyAction(id: string, formData: FormData) {
    const session = await getSession();
    if (session?.role !== 'MASTER_ADMIN') {
        throw new Error("Unauthorized");
    }

    const name = formData.get('name') as string;
    const credit = Number(formData.get('credit'));
    // Type usually doesn't change easily, but let's allow basic edits

    await storage.updateAgency(id, {
        name,
        credit
    });

    revalidatePath('/admin/agencies');
    return { success: true };
}

export async function toggleAgencyStatusAction(id: string, isActive: boolean) {
    const session = await getSession();
    if (session?.role !== 'MASTER_ADMIN') {
        throw new Error("Unauthorized");
    }

    // Prevent disabling the Owner agency
    if (id === 'tejwal' && !isActive) {
        throw new Error("Cannot disable Master Agency");
    }

    await storage.updateAgency(id, { isActive });
    revalidatePath('/admin/agencies');
}

export async function deleteAgencyAction(id: string) {
    const session = await getSession();
    if (session?.role !== 'MASTER_ADMIN') {
        throw new Error("Unauthorized");
    }

    if (id === 'tejwal') {
        throw new Error("Cannot delete Master Agency");
    }

    await storage.deleteAgency(id); // Soft delete
    revalidatePath('/admin/agencies');
}
