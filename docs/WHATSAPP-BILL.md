# WhatsApp bill

Send a customer's bill to their WhatsApp — one bill at a time, only when a
staff member taps **Send bill on WhatsApp** in the order details. There is
no bulk send and nothing sends automatically at checkout.

## What works today

- `POST /v1/orders/:id/send-bill-whatsapp?branchId=…` (permission
  `bills.print`, the same permission as printing a bill). Body: the same
  bill adjustments as a bill preview, plus an optional `phone` override —
  otherwise the customer's phone on file is used. The bill goes out at the
  server-priced figures, so a sent bill always matches the printed bill
  (open bills are marked provisional / not yet paid in the message).
- The message is a plain-text bill: restaurant and branch name, bill number
  and date, each item with quantity and line total, subtotal, discount, tax,
  tip, total, paid and balance due. No offers, no links, no marketing.
- **The Meta provider is implemented.** With `WHATSAPP_BILL_PROVIDER=
  meta-cloud` and the credentials below, the bill goes out through the Meta
  WhatsApp Business Cloud API as an approved utility template message
  (see "Going live with Meta" below). The provider never reports a success
  it did not get: if Meta rejects the message or is unreachable, the
  endpoint answers 400 and nothing is recorded as sent.
- **Send-status tracking.** Every send attempt gets a `WhatsAppBillSend`
  row (`QUEUED → SENT → DELIVERED → READ`, or `FAILED` with the provider's
  reason). Meta's delivery/read receipts arrive on the status webhook and
  advance the same row, matched by Meta's message id. A bill that fails at
  Meta leaves a `FAILED` row instead of vanishing, and the failure is also
  in the audit log as `order.bill_whatsapp_failed`.
- Every successful send is written to the audit log as
  `order.bill_whatsapp_sent` (provider + message id + send id). The message
  text itself is never logged, and the send row stores the recipient masked
  (`••••1234`) — the full number stays on the order/customer.
- **The default provider sends nothing.** RestroOS ships with a stub
  (`noop`) provider, and the Meta provider reports not-configured until its
  phone-number ID, access token and template name are all set. Until then
  the endpoint answers `400 "WhatsApp bills are not set up on this server"`
  and the app shows that as a toast. A bill is never reported sent when it
  was not.

## Going live with Meta

RestroOS has no WhatsApp account of its own — the account, phone number and
template belong to the restaurant owner. Steps (do these from the
restaurant's Meta account, not from this repo):

1. **Meta developer app.** At developers.facebook.com, create an app (type
   "Business"), add the **WhatsApp** product, and create or connect a
   WhatsApp Business account with a phone number. The number is what
   customers see the bill coming from — it can be a dedicated business
   number, not a personal one.
2. **Access token.** In the app's WhatsApp → API Setup, generate a token.
   A temporary test token expires in 24 hours; for production create a
   **permanent token** (a system user with `whatsapp_business_messaging`
   permission on the app) and keep it in `.env` only — never commit it,
   never paste it into a chat or ticket.
3. **Approved template.** In WhatsApp Manager → Account tools → Message
   templates, create a **utility** template (category: Utility). The code
   sends the whole bill as the template body's single `{{1}}` parameter,
   so the template body should be exactly `{{1}}` — name it something
   like `restroos_bill`. Submit it for approval (usually a day or two;
   Meta rejects templates that read like marketing — this one is a bill,
   so it fits utility). Put the approved name in
   `WHATSAPP_BILL_TEMPLATE_NAME`.
   - The template body must be exactly `{{1}}`: the code passes the whole
     bill as that one parameter, so any static text in the template would
     need a matching code change (split the bill across parameters). If
     Meta rejects a body that is only a variable, that is a code change,
     not a settings change — say so before editing the template.
4. **Environment.** In the backend `.env`:
   - `WHATSAPP_BILL_PROVIDER=meta-cloud`
   - `WHATSAPP_PHONE_NUMBER_ID=` — from WhatsApp → API Setup ("Phone
     number ID", not the number itself).
   - `WHATSAPP_API_TOKEN=` — the permanent token from step 2.
   - `WHATSAPP_BILL_TEMPLATE_NAME=` — the approved template name.
   - `WHATSAPP_API_VERSION=` — the pinned Graph API version (default
     `v21.0`). Confirm the current version in Meta's docs when setting
     up; Meta drops old versions, and a dropped version fails sends
     with a clear error from Meta.
   - `WHATSAPP_BILL_TEMPLATE_LANGUAGE=en` — only if the template was
     created in another language.
5. **Status webhook (delivery receipts, optional but recommended).**
   Without it, bills still send — they just stay at `SENT` and never
   show delivered/read. To enable it:
   - In the Meta app, WhatsApp → Configuration → Webhook: subscribe to
     the **messages** webhook field and set the callback URL to
     `https://<your-public-base-url>/api/v1/whatsapp-bill/webhook`
     (same host the frontend reaches the backend on; Meta must reach it
     over public HTTPS).
   - Set `WHATSAPP_VERIFY_TOKEN=` to a random string you invent, enter
     the same string as the verify token in Meta's webhook setup, and
     Meta's GET handshake will confirm the URL.
   - Set `WHATSAPP_APP_SECRET=` to the app secret (App Settings →
     Basic). The server verifies every callback's
     `X-Hub-Signature-256` header against it; without the secret, all
     callbacks are refused.
   - After the migration below, receipts advance the send row: `sent` →
     `SENT`, `delivered` → `DELIVERED`, `read` → `READ`, `failed` →
     `FAILED` with Meta's reason. Statuses only ever move forward.
6. **Database migration.** Apply
   `apps/backend/prisma/migrations/20261125170000_whatsapp_bill_sends/`
   (adds the `whatsapp_bill_sends` table and the
   `WhatsAppBillSendStatus` enum) with the usual Prisma migrate flow
   before the first real send — without it the send endpoint fails
   because the table does not exist.
7. **Test.** Send one bill to the owner's own number from the order
   screen and check it arrives; then check the send row moved to
   `DELIVERED`/`READ` (or check the audit log entry). A test number that
   has never messaged the business still receives a template message —
   that is the point of templates — but the 24-hour customer-service
   window rules do not apply to template messages.

## Configuration (environment variables only)

No credentials live in the database or in the repo. See
`apps/backend/.env.example`:

| Variable | Meaning |
|---|---|
| `WHATSAPP_BILL_PROVIDER` | `noop` (default, sends nothing) or `meta-cloud`. Reserved name for a future provider: `twilio`. |
| `WHATSAPP_BILL_TEMPLATE_NAME` | Approved Meta utility template name (required by `meta-cloud`). |
| `WHATSAPP_BILL_TEMPLATE_LANGUAGE` | Template language code, default `en`. |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta phone-number ID that sends the bill. |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Meta WhatsApp Business account ID — optional, not needed for sending. |
| `WHATSAPP_API_TOKEN` | Meta access token (permanent token for production). |
| `WHATSAPP_API_VERSION` | Pinned Graph API version, default `v21.0`. |
| `WHATSAPP_APP_SECRET` | Meta app secret — verifies status-webhook signatures. |
| `WHATSAPP_VERIFY_TOKEN` | Token Meta presents when verifying the webhook URL. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | Twilio credentials (reserved — unused until that provider is implemented). |

Setting the credential variables alone does nothing until the matching
provider is implemented — an unknown `WHATSAPP_BILL_PROVIDER` value logs a
warning at startup and falls back to `noop`, so a typo can never take the
till down or fake a send. Likewise, setting `WHATSAPP_BILL_PROVIDER=
meta-cloud` without the phone ID, token and template name leaves the
provider not-configured and the endpoint keeps refusing with 400.

## Plugging in another provider

1. Implement `BillSenderProvider` (`apps/backend/src/modules/whatsapp-bill/
   bill-sender.interface.ts`): `name`, `isConfigured()` (false when its
   credentials are missing), and `sendBill({ to, bill, message })`, which
   must throw unless the provider accepted the message — never report a
   success that did not happen. Return `messageId` (and `templateName`
   when it uses one) so the send row is filled in.
2. Register it in `whatsapp-bill.module.ts`: add the provider class and
   return it from the `BILL_SENDER_PROVIDER` factory for its
   `WHATSAPP_BILL_PROVIDER` name.
3. Add its credentials to `.env` (never commit them) and document them in
   `.env.example` and in the table above.

The service (`whatsapp-bill.service.ts`), the endpoint, the template and
the UI need no changes — they only talk to the interface. The status
webhook is Meta-shaped; another provider would need its own receipt
endpoint that calls the same row update.

## Notes

- The older marketing flow (`campaign.message` webhook) is untouched: it
  hands bulk SMS/WhatsApp campaigns to the restaurant's own webhook, and is
  a different thing from sending one bill.
- The **WhatsApp** link already in the order dialog is also untouched: it
  just opens `wa.me/…` in the staff member's own WhatsApp so they can type
  a message by hand. The new button sends the bill from the server instead.
- Customer consent: only send a bill to a customer who gave the restaurant
  their number for this purpose. If a customer asks not to be messaged on
  WhatsApp, do not use the button for them — the printed bill is the
  fallback.
- No account has been created and no external service has been contacted
  for this feature. Do not sign up for anything from this repo alone — the
  account, phone number and template belong to the restaurant.
