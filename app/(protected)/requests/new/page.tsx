
import { getSession } from "@/lib/actions";
import { redirect } from "next/navigation";
import CaseCreationWizard from "@/components/CaseCreationWizard";

export default async function NewCasePage() {
    const session = await getSession();
    if (!session) redirect("/login");

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">إنشاء طلب جديد</h1>
            <CaseCreationWizard />
        </div>
    );
}
