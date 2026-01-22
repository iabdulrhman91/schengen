'use client';



import { promoteWaitlistAction } from "@/lib/actions";

import { Button } from "@/components/ui/core";
import { useTransition } from "react";

export function PromoteButton({ caseId, disabled }: { caseId: string, disabled?: boolean }) {
    const [isPending, startTransition] = useTransition();

    const handlePromote = () => {
        if (confirm("هل أنت متأكد من ترقية هذا الطلب إلى مؤكد؟ سيتم حجز مقعد من السعة.")) {
            startTransition(async () => {
                try {
                    await promoteWaitlistAction(caseId);
                    alert("تمت الترقية بنجاح!");
                } catch (e: any) {
                    alert("حدث خطأ: " + e.message);
                }
            });
        }
    };

    return (
        <Button
            onClick={handlePromote}
            disabled={isPending || disabled}
            className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-2 py-1 h-8"
        >
            {isPending ? 'جاري الترقية...' : 'ترقية لمؤكد ⬆'}
        </Button>
    );
}
