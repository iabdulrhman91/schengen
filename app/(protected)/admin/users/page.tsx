
import { storage } from "@/lib/storage";
import UserList from "./user-list";
import { getSession } from "@/lib/actions";
import { redirect } from "next/navigation";

export default async function UsersPage() {
    const session = await getSession();
    if (session?.role !== 'MASTER_ADMIN') {
        redirect('/');
    }

    // Get all users (including deleted if we implemented filtering UI, but for now just active is safer default, but let's show all valid accounts)
    // Actually the adapter default is active only for now unless we pass true.
    // Let's pass true to see everyone and allow re-activation.
    const users = await storage.getUsers(true);
    const agencies = await storage.getAgencies(true);

    return (
        <div className="max-w-6xl mx-auto py-8">
            <UserList users={users} agencies={agencies} />
        </div>
    );
}
