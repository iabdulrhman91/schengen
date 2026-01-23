'use server';

import { getSession } from "@/lib/actions";
import { storage } from "@/lib/storage";
import { User, Role } from "@/lib/storage/types";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";

export async function createUserAction(formData: FormData) {
    const session = await getSession();
    if (session?.role !== 'MASTER_ADMIN' && session?.role !== 'ADMIN') {
        throw new Error("Unauthorized");
    }

    const username = formData.get('username') as string;
    const name = formData.get('name') as string;
    const role = formData.get('role') as Role;
    const agencyId = formData.get('agencyId') as string;
    const password = formData.get('password') as string;

    if (!username || !name || !role || !password) {
        return { success: false, error: "جميع الحقول مطلوبة" };
    }

    if (role !== 'MASTER_ADMIN' && !agencyId) {
        return { success: false, error: "يجب تحديد وكالة لهذا المستخدم" };
    }

    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
        return { success: false, error: "اسم المستخدم مسجل مسبقاً" };
    }

    const hashedPassword = await hash(password, 10);

    const newUser = await storage.createUser({
        username,
        name,
        role,
        agencyId: role === 'MASTER_ADMIN' ? undefined : agencyId,
        password: hashedPassword,
        isActive: true,
        createdAt: new Date().toISOString()
    });

    revalidatePath('/admin/users');
    return { success: true };
}

export async function updateUserAction(id: string, formData: FormData) {
    const session = await getSession();
    if (session?.role !== 'MASTER_ADMIN' && session?.role !== 'ADMIN') {
        throw new Error("Unauthorized");
    }

    const name = formData.get('name') as string;
    const role = formData.get('role') as Role;
    const agencyId = formData.get('agencyId') as string;
    const password = formData.get('password') as string;

    const updateData: Partial<User> = {
        name,
        role,
        agencyId: role === 'MASTER_ADMIN' ? undefined : agencyId
    };

    if (password && password.trim() !== "") {
        updateData.password = await hash(password, 10);
    }

    await storage.updateUser(id, updateData);
    revalidatePath('/admin/users');
    return { success: true };
}

export async function toggleUserStatusAction(id: string, isActive: boolean) {
    const session = await getSession();
    if (session?.role !== 'MASTER_ADMIN' && session?.role !== 'ADMIN') {
        throw new Error("Unauthorized");
    }

    // Prevent disabling self
    if (session.id === id && !isActive) {
        throw new Error("Cannot disable your own account");
    }

    await storage.updateUser(id, { isActive });
    revalidatePath('/admin/users');
    return { success: true };
}

export async function deleteUserAction(id: string) {
    const session = await getSession();
    if (session?.role !== 'MASTER_ADMIN') {
        throw new Error("Unauthorized: Only Master Admin can delete users");
    }

    if (session.id === id) {
        throw new Error("Cannot delete your own account");
    }

    await storage.deleteUser(id);
    revalidatePath('/admin/users');
    return { success: true };
}
