'use client';

import { useActionState } from 'react';
import { resendWebhookAction } from '@/lib/actions';
import { Button } from "@/components/ui/core";
import { Loader2, RefreshCw } from 'lucide-react';

export function ResendButton({ logId }: { logId: string }) {
    // Wrapper to match signature if needed, or just use as action
    const resend = async (_prev: any, _formData: FormData) => {
        try {
            await resendWebhookAction(logId);
            return { success: true };
        } catch (e) {
            return { success: false };
        }
    };

    const [state, action, isPending] = useActionState(resend, null);

    return (
        <form action={action}>
            <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                className="h-6 w-6 p-0 hover:bg-gray-200 rounded-full"
                title="إعادة إرسال (Retry)"
            >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 text-gray-500" />}
            </Button>
        </form>
    );
}
