import { WebhookLog } from './storage/types';
import { storage } from './storage';
import crypto from 'crypto';

export async function triggerWebhook(log: WebhookLog) {
    const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
    const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

    if (!WEBHOOK_URL) {
        console.warn("N8N_WEBHOOK_URL is not set. Webhook skipped.", log.id);
        return;
    }

    if (!WEBHOOK_SECRET) {
        console.error("N8N_WEBHOOK_SECRET is not set. Cannot sign webhook.");
        await storage.updateWebhookLog(log.id, {
            status: 'FAILED',
            errorMessage: 'Missing N8N_WEBHOOK_SECRET'
        });
        return;
    }

    // Construct Payload
    // The log.payload is completely raw string, but we want to wrap it in the standard envelope?
    // User Requirement:
    // payload: { event_id, event_type, ...data }
    // The log.payload likely contains "data".
    // Let's parse log.payload to merge it.

    let data = {};
    try {
        data = JSON.parse(log.payload);
    } catch (e) {
        data = { raw: log.payload };
    }

    const finalPayload = {
        event_id: log.eventId,
        event_type: log.event,
        ...data
    };

    const rawBody = JSON.stringify(finalPayload);

    // Signature
    const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-webhook-signature': signature
            },
            body: rawBody
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const responseData = await response.json().catch(() => null);

        // Update Log
        await storage.updateWebhookLog(log.id, {
            status: 'SENT',
            processedAt: new Date().toISOString(),
            responsePayload: JSON.stringify(responseData)
        });

    } catch (error: any) {
        console.error("Webhook Failed:", error);
        await storage.updateWebhookLog(log.id, {
            status: 'FAILED',
            errorMessage: error.message,
            processedAt: new Date().toISOString()
        });
    }
}
