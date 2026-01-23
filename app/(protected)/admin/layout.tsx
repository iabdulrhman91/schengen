import { getSession } from "@/lib/actions";
import { redirect } from "next/navigation";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    // Role Guard: MASTER_ADMIN or ADMIN allowed
    // Ideally we might want granular checks per page, but this is the high-level gate
    if (session.role !== 'MASTER_ADMIN' && session.role !== 'ADMIN' && session.role !== 'VISA_MANAGER') {
        redirect("/"); // Send unauthorized users back to dashboard
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50/50">
            {children}
        </div>
    );
}
