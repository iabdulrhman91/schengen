# N8N Webhook Integration

هذا المستند يشرح كيفية ربط نظام الأتمتة (مثل n8n) مع نقطة النهاية `webhook endpoint` في نظام تجوال لتحديث حالة الإشعارات.

## Endpoint Information

- **URL**: `POST /api/webhooks/n8n`
- **Content-Type**: `application/json`

## Authentication & Security

1. **Secret Key**: يجب تكوين متغير البيئة `N8N_WEBHOOK_SECRET` في السيرفر.
2. **HMAC Signature**: يجب إرسال توقيع `HMAC SHA256` للـ Body باستخدام المفتاح السري المذكور أعلاه في هيدر `x-webhook-signature`.

- **Header**: `x-webhook-signature`
- **Value**: `HMAC_SHA256(raw_body, N8N_WEBHOOK_SECRET)` (Hex encoded).

---

## Request Body Format

يجب أن يكون الـ Body بترميز JSON ويحتوي على الحقول التالية:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_id` | UUID | **Yes** | معرف الحدث العام (`eventId`) الذي تم استلامه من النظام. لا تستخدم ID الداخلي. |
| `status` | String | **Yes** | حالة المعالجة: `SENT` أو `FAILED`. |
| `provider_message_id` | String | No | معرف الرسالة من المزود. |
| `error_message` | String | No | رسالة الخطأ في حال الفشل. |
| `response_payload` | Any | No | أي بيانات إضافية. |

### Example: Success (SENT)

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "SENT",
  "provider_message_id": "wamid.HBgL..."
}
```

---

## Example cURL (Generating Signature)

لتجربة الـ Webhook يدوياً، يجب توليد التوقيع. مثال باستخدام `openssl`:

```bash
# 1. Define Secret and Payload
SECRET="my-super-secret-key"
PAYLOAD='{"event_id": "REPLACE_UUID", "status": "SENT"}'

# 2. Generate Signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

# 3. Send Request
curl -X POST http://localhost:3000/api/webhooks/n8n \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### Example: Failure (FAILED)

```json
{
  "event_id": "log-uuid-1234",
  "status": "FAILED",
  "error_message": "Invalid Phone Number"
}
```

---

## Response Codes

- **200 OK**: تم تحديث السجل بنجاح (أو كان محدثاً مسبقاً).
- **400 Bad Request**: بيانات ناقصة (event_id او status).
- **401 Unauthorized**: الـ Secret غير صحيح.
- **404 Not Found**: الـ `event_id` غير موجود في النظام.
- **500 Internal Server Error**: خطأ في الخادم.
