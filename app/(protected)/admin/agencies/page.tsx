import { auth } from "@/auth";
import { JsonStorage } from "@/lib/storage/json-adapter";
import { AgenciesTable } from "@/components/admin/AgenciesTable";
import { redirect } from "next/navigation";

export default async function AdminAgenciesPage() {
    const session = await auth();
    console.log("Current user role:", session?.user?.role); // Debug

    // Strict Access: Only MASTER_ADMIN can access this page
    if (session?.user?.role !== "MASTER_ADMIN") {
        redirect("/");
    }

    const storage = new JsonStorage();
    const agencies = await storage.getAgencies(true); // include deleted/archived for master admin

    return (
        <div className="container mx-auto max-w-7xl py-10 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">إدارة الوكالات</h1>
                <p className="text-gray-500">عرض وإدارة الوكالات المسجلة في النظام.</p>
            </div>

            <AgenciesTable agencies={agencies} />
        </div>
    );
}
