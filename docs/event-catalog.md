# Event Catalog (Webhooks)

هذا المستند يوثق جميع الأحداث التي يطلقها النظام عبر الـ Webhook API.

## الهيكلية الموحدة (Unified Schema)

جميع الأحداث تتبع الهيكل التالي في الـ Payload:

```json
{
  "event_id": "UUID",
  "event_type": "EVENT_NAME",
  "case": { "id": "...", "fileNumber": "...", "status": "..." },
  "agency": { "id": "...", "name": "..." },
  "appointment": { "id": "...", "code": "..." }, // If applicable
  "request": { "id": "...", "type": "..." }, // If applicable
  "meta": {
      "triggeredBy": "username",
      "timestamp": "ISO8601",
      "isRetry": false
  }
}
```

---

## 1. CASE_SUBMITTED
- **الوصف**: يتم إطلاقه عندما تقوم الوكالة بإرسال طلب جديد بنجاح.
- **Trigger**: زر "إرسال" (Submit) في معالج الطلبات.
- **حقول مميزة**: `appointmentStatus` (Waiting/Confirmed).

## 2. WAITLIST_PROMOTED
- **الوصف**: يتم إطلاقه عندما يقوم المدير بترقية طلب من قائمة الانتظار إلى المؤكد.
- **Trigger**: زر "ترقية" (Promote) في صفحة إدارة المواعيد.
- **حقول مميزة**: `previousStatus` ("WAITING"), `newStatus` ("CONFIRMED").

## 3. AMENDMENT_REQUEST_CREATED
- **الوصف**: يتم إطلاقه عندما تطلب الوكالة تعديل أو إلغاء أو إعادة جدولة.
- **Trigger**: زر "طلب تعديل" في صفحة تفاصيل القضية.
- **حقول مميزة**: `request.type` (EDIT/CANCEL/RESCHEDULE), `request.details`.

## 4. AMENDMENT_DECISION
- **الوصف**: يتم إطلاقه عند الموافقة أو الرفض لطلب التعديل.
- **Trigger**: زر "Approve/Reject" في لوحة الإدارة.
- **حقول مميزة**: `request.newStatus` (APPROVED/REJECTED), `request.effects` (قائمة التغييرات).

---

## ملاحظات
- **Idempotency**: عند "إعادة الإرسال" (Retry)، يتم توليد `event_id` جديد تماماً، ويحتوي الـ payload على `meta.isRetry: true`.
- **States**: هذه الأحداث للإخطار فقط (Notification) ولا تقوم بتغيير الحالة مرة أخرى إذا فشل الإرسال (Fire-and-forget logic with logs).
