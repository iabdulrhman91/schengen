import { getSession } from "@/lib/actions";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    const { storage } = await import("@/lib/storage");
    const agency = session.agencyId ? await storage.getAgency(session.agencyId) : null;

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar user={session as any} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <Header user={session as any} agency={agency} />
                <main className="flex-1 p-6 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
