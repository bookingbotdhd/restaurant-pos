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
- Every send is written to the audit log as `order.bill_whatsapp_sent`
  (provider + message id). The message text itself is never logged.
- **The default provider sends nothing.** RestroOS ships with a stub
  (`noop`) provider, so until a real provider is configured the endpoint
  answers `400 "WhatsApp bills are not set up on this server"` and the app
  shows that as a toast. A bill is never reported sent when it was not.

## What is NOT built (and why)

RestroOS has no WhatsApp account of its own, and WhatsApp does not let an
app send messages from a phone number without a provider. Going live needs
**an account from the restaurant owner** — one of:

1. **Meta WhatsApp Business Platform (Cloud API)** — a WhatsApp Business
   account + a Meta developer app with a phone number. This is the direct
   route: no middleman, Meta's own per-message pricing.
2. **Twilio (or a similar WhatsApp Business provider)** — a Twilio account
   with a WhatsApp-enabled sender. Easier setup, Twilio's pricing on top.

Either way, the owner also needs an **approved message template**: WhatsApp
only lets a business start a conversation with an approved template
(a *utility* template fits a bill — order number, items, totals). The
template's name goes in `WHATSAPP_BILL_TEMPLATE_NAME`. Getting the
template approved is the provider's process, not something RestroOS can do
— it usually takes a day or two, and Meta rejects templates that read like
marketing. The bill text in `bill-templates.ts` is written to fit a utility
template (bill only, no offers).

No account has been created and no external service has been contacted for
this feature. Do not sign up for anything from this repo alone — the
account, phone number and template belong to the restaurant.

## Configuration (environment variables only)

No credentials live in the database or in the repo. See
`apps/backend/.env.example`:

| Variable | Meaning |
|---|---|
| `WHATSAPP_BILL_PROVIDER` | `noop` (default, sends nothing). Reserved names for future providers: `meta-cloud`, `twilio`. |
| `WHATSAPP_BILL_TEMPLATE_NAME` | Approved template name, when the provider needs one. |
| `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_API_TOKEN` | Meta Cloud API credentials (reserved — unused until that provider is implemented). |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | Twilio credentials (reserved — unused until that provider is implemented). |

Setting the credential variables alone does nothing until the matching
provider is implemented — an unknown `WHATSAPP_BILL_PROVIDER` value logs a
warning at startup and falls back to `noop`, so a typo can never take the
till down or fake a send.

## Plugging in a real provider

1. Implement `BillSenderProvider` (`apps/backend/src/modules/whatsapp-bill/
   bill-sender.interface.ts`): `name`, `isConfigured()` (false when its
   credentials are missing), and `sendBill({ to, bill, message })`, which
   must throw unless the provider accepted the message — never report a
   success that did not happen.
2. Register it in `whatsapp-bill.module.ts`: add the provider class and
   return it from the `BILL_SENDER_PROVIDER` factory for its
   `WHATSAPP_BILL_PROVIDER` name.
3. Add its credentials to `.env` (never commit them) and document them in
   `.env.example` and in the table above.

The service (`whatsapp-bill.service.ts`), the endpoint, the template and
the UI need no changes — they only talk to the interface.

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
