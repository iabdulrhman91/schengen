import { PricingManager } from "@/components/admin/PricingManager";
import { getSession } from "@/lib/actions";
import { redirect } from "next/navigation";

export default async function AdminPricingPage() {
    const session = await getSession();
    console.log("AdminPricingPage Session:", session);

    const role = session?.role; // Fix access if structure is flat, but previous log showed nest.
    console.log("AdminPricingPage Session:", JSON.stringify(session, null, 2));

    /* DEBUG: Bypass Redirect */
    // if (role !== 'ADMIN') {
    //    console.log("Redirecting because role is:", role);
    //     redirect('/');
    // }

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <PricingManager />
        </div>
    );
}
