import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

    // 1. Strict Env Check
    if (!WEBHOOK_SECRET) {
        console.error("N8N_WEBHOOK_SECRET is not set in environment variables.");
        return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
    }

    // 2. Read Raw Body for HMAC
    const rawBody = await req.text();

    // 3. Security Check (HMAC Signature)
    const signature = req.headers.get('x-webhook-signature');
    if (!signature) {
        return NextResponse.json({ error: 'Missing Signature' }, { status: 401 });
    }

    const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

    if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
    }

    try {
        const body = JSON.parse(rawBody);
        const { event_id, status, provider_message_id, error_message, response_payload } = body;

        // event_id here corresponds to our 'eventId' (UUID)
        if (!event_id || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 4. Find Log by eventId
        const logs = await storage.getWebhookLogs();
        const log = logs.find(l => l.eventId === event_id);

        if (!log) {
            return NextResponse.json({ error: 'Event ID not found' }, { status: 404 });
        }

        // 5. Idempotency Check
        if ((log.status === 'SENT' || log.status === 'FAILED') && log.status === status) {
            return NextResponse.json({ message: 'Already processed', status: log.status });
        }

        // 6. Update Log (using internal ID)
        await storage.updateWebhookLog(log.id, {
            status: status as 'SENT' | 'FAILED',
            providerMessageId: provider_message_id,
            errorMessage: error_message,
            responsePayload: typeof response_payload === 'object' ? JSON.stringify(response_payload) : response_payload,
            processedAt: new Date().toISOString()
        });

        return NextResponse.json({ success: true, event_id });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
