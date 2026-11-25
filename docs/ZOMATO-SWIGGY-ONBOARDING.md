# Connecting Zomato & Swiggy to RestroOS

RestroOS does **not** call Zomato or Swiggy — neither platform offers a public
order API that a restaurant POS can poll or log into. Orders reach RestroOS
the way the platforms themselves deliver them: as a webhook push, either from
the platform's own merchant webhook or from an **aggregator / channel
manager** the restaurant already has an account with (UrbanPiper, Petpooja,
Dotpe and similar). This guide covers the whole setup, end to end.

What you get when it works: every Zomato / Swiggy order appears in RestroOS
as an **online order waiting for acceptance**, with the customer, address and
items already filled in, priced from your live menu. Staff accept or reject
it in the dashboard / KDS exactly like any other online order.

What you do **not** get: RestroOS never sends accept / reject / ready back to
the platform, never syncs your menu to Zomato/Swiggy, and never fetches
orders. Status still has to be confirmed inside the platform or the
aggregator. See "What is still manual" at the bottom.

## 0. Before you start — what must already exist

| # | Prerequisite | Who provides it |
|---|---|---|
| 1 | A live Zomato restaurant listing and/or Swiggy outlet, able to receive orders | Zomato / Swiggy merchant onboarding |
| 2 | An aggregator / channel-manager account (UrbanPiper, Petpooja, Dotpe…) **or** access to the platform's merchant-webhook settings | The aggregator, or Zomato/Swiggy merchant support |
| 3 | A RestroOS installation reachable from the internet over HTTPS (the aggregator has to reach it — a `localhost` URL will not work) | Whoever hosts RestroOS |
| 4 | A RestroOS owner/admin login (Settings → Integrations needs `settings.manage`) | The restaurant owner |

If (2) is missing, stop here: there is nothing to point at RestroOS yet.
Pick the aggregator first — it is the piece that actually talks to Zomato
and Swiggy on your behalf.

## 1. Choose a route

- **Route A — aggregator (recommended).** One webhook for everything. In
  RestroOS use the **Aggregator (UrbanPiper, Petpooja, other)** card; in the
  aggregator, forward Zomato and Swiggy orders to RestroOS. Use this when
  you already pay for an aggregator, or want one place to manage both
  platforms.
- **Route B — one card per platform.** Use the **Zomato** card for Zomato
  orders and the **Swiggy** card for Swiggy orders, each with its own URL
  and secret. Use this when each platform pushes to you directly (merchant
  webhook) and you want the two streams kept separate with no extra mapping.

Both routes use the same signed format below; only the URL and the secret
differ. You can run A and B side by side — just never point two sources at
the same URL with different secrets.

## 2. Create the connection in RestroOS

1. Log in as owner/admin → **Settings → Integrations**.
2. Find the card (**Zomato**, **Swiggy**, or **Aggregator**) and open it.
3. The card shows your exact webhook URL — copy it:
   `POST https://<your-restroos-domain>/api/v1/integration-hub/webhook/<restaurantId>/<provider>`
   where `<provider>` is `zomato`, `swiggy` or `aggregator`. The
   `<restaurantId>` is already filled in; do not edit it.
4. Click **Generate secret** (or type your own long random string, 16+
   characters — e.g. `openssl rand -hex 24`). **Copy it now**: it is stored
   encrypted and is never shown again.
5. Leave the card **Enabled**. (Disabling it later stops all deliveries for
   that provider instantly — the endpoint answers 401.)
6. Optionally fill in the platform account ID (Zomato restaurant ID / Swiggy
   outlet ID) so staff can see which outlet the card belongs to. It is
   informational only; it is not used to verify orders.

The card stays **Pending** until a correctly signed delivery actually
arrives. Saving the secret never marks it Connected — that is deliberate,
so a typo cannot look like a working integration.

## 3. Point the aggregator (or merchant webhook) at RestroOS

In the aggregator's dashboard (or the platform's merchant-webhook settings):

1. Set the webhook / callback URL to the URL copied in step 2.
2. Set the signing secret to the **same** secret from step 2.
3. Configure the aggregator to send each order as one JSON body in
   RestroOS's canonical format, signed as below. **This is the step most
   people get wrong**: UrbanPiper, Petpooja, Dotpe, Zomato and Swiggy each
   have their own native webhook payload, and RestroOS cannot read those
   natively. One of these must be true:
   - the aggregator lets you define a custom webhook payload / mapping
     (map its fields onto the format below), **or**
   - a small mapping script sits between the aggregator and RestroOS: it
     receives the aggregator's native webhook, rebuilds the canonical
     body, signs it with the shared secret, and forwards it.
   If the aggregator offers neither, it cannot feed RestroOS yet — ask the
   aggregator's support for "custom webhook payload" / "webhook mapping".
4. If you use Route A (single Aggregator endpoint) for more than one
   platform, include `"platform": "zomato"` or `"platform": "swiggy"` in
   each order event, so orders are filed under the right platform. On the
   dedicated `zomato` / `swiggy` endpoints this field is ignored — the
   endpoint itself decides the source, so it cannot be spoofed.

### The signed format

```
POST <webhook URL>
Content-Type: application/json
X-RestroOS-Timestamp: <unix seconds>
X-RestroOS-Signature: sha256=<hex HMAC-SHA256(secret, timestamp + "." + rawBody)>
```

`rawBody` is the exact JSON bytes sent — the signature is computed over
those bytes, not over a re-serialised object. Deliveries more than 5
minutes old (by the timestamp header) are refused, which bounds replays.

### Events

| `event` | Body (besides `event`) | Effect in RestroOS |
|---|---|---|
| `ping` | — | Proves the secret works; marks the card **Connected**. Send this first. |
| `order.created` | `orderId` (the platform's order id), `type` (`DELIVERY` default, or `TAKEAWAY`), `paymentMode` (`PREPAID` / `COD`), `customer{name, phone, email?, ref?}`, `delivery{address, pincode?}` (required for `DELIVERY`), `items[{name or menuItemId, quantity, kitchenNote?}]`, optional `branchId`, `notes`, optional `platform` (`zomato` / `swiggy`, Aggregator endpoint only) | Creates an ONLINE order awaiting acceptance. `externalSource` is the provider (or `platform`), `externalOrderId` is `orderId`. |
| `order.cancelled` | `orderId`, optional `reason`, optional `platform` | Declines the order **only if it is still waiting for acceptance**. If staff already accepted it, the cancellation is logged as needing attention and a person must decide. |

Rules that protect the kitchen:

- **Prices, tax and fees are never read from the payload** — they are
  recomputed from your live RestroOS menu.
- **Items are matched to the live menu** by `menuItemId`, or by exact item
  name (case-insensitive). One unknown dish refuses the **whole** order
  (HTTP 422, visible in the card's activity log) instead of silently
  dropping a line. Keep dish names identical on the platform and in
  RestroOS, or map them to `menuItemId`s in the aggregator/mapping script.
- **A repeated `orderId` never creates a second order** — a retried
  delivery returns the existing order.
- `branchId` is required when the restaurant has several branches; with a
  single branch it can be omitted.
- The endpoint allows 120 deliveries per minute per caller; beyond that it
  answers 429.

### Example: send a test `ping`

```python
import hashlib, hmac, json, time, urllib.request

SECRET = "paste-the-secret-from-restroos-here"   # same value as step 2
URL = "https://<your-restroos-domain>/api/v1/integration-hub/webhook/<restaurantId>/zomato"

body = json.dumps({"event": "ping"}).encode()
ts = str(int(time.time()))
sig = "sha256=" + hmac.new(
    SECRET.encode(), f"{ts}.".encode() + body, hashlib.sha256
).hexdigest()

req = urllib.request.Request(URL, data=body, method="POST", headers={
    "Content-Type": "application/json",
    "X-RestroOS-Timestamp": ts,
    "X-RestroOS-Signature": sig,
})
print(urllib.request.urlopen(req).read())  # {"ok": true} — and the card turns Connected
```

## 4. Test end to end

1. **Ping first** (example above, or the aggregator's "send test event").
   Expect `{"ok": true}` and the card turning **Connected**. Anything else
   → see Troubleshooting.
2. **Send a real test order** from the aggregator / platform (a test order,
   or a small live order). It must appear in **Orders** as an online order
   awaiting acceptance, with the platform name in its note
   (e.g. `[Zomato #12345 - PAID online]`).
3. **Accept it** in the dashboard and check it reaches the KDS / kitchen
   like any other online order. Then **cancel a still-pending test order**
   from the platform side and check RestroOS declines it.
4. **Send the same order twice** (or let the aggregator retry): only one
   order may exist — the second delivery is reported as a duplicate.
5. Check **Settings → Integrations → the card → activity log**: every
   accepted, refused and failed delivery is listed there with the reason.

## 5. Day-to-day operation

- Orders arrive as **ONLINE / awaiting acceptance** (unless the branch has
  auto-confirm on). Accept, reject, cook and settle them exactly like
  website orders. The platform order id is in the order note and in the
  order's `externalSource` / `externalOrderId`.
- **Menu changes:** rename a dish in RestroOS and the platform's orders for
  the old name start failing with 422 — update the name (or the mapping)
  on the platform side at the same time.
- **Disable in a hurry:** toggle the card off in Settings → Integrations.
  Deliveries are refused immediately; re-enabling returns the card to
  Pending until the next signed delivery arrives.
- **Disconnect** (delete the card) removes the stored secret and the log.
  The aggregator will get 401s until you set the card up again with a new
  secret.
- **Rotate the secret:** generate a new one in RestroOS, paste it into the
  aggregator, then send a `ping`. Do both sides promptly — deliveries
  signed with the old secret fail from the moment you save the new one.

## 6. Self-hosted installs: environment-variable config (optional)

Most restaurants should use the UI (step 2). A single-restaurant
self-hosted install can instead configure the webhook in deployment
config — see `apps/backend/.env.example`:

```
AGGREGATOR_ZOMATO_WEBHOOK_SECRET=<16+ chars, same value as in the aggregator>
AGGREGATOR_SWIGGY_WEBHOOK_SECRET=<16+ chars>
AGGREGATOR_AGGREGATOR_WEBHOOK_SECRET=<16+ chars>
AGGREGATOR_ZOMATO_ENABLED=true        # per-provider on/off, default true
AGGREGATOR_WEBHOOKS_ENABLED=true      # global kill-switch, default true
```

Rules: the env secret is only used when the restaurant has **no** saved
connection for that provider; a saved-but-disabled connection is never
re-enabled by the environment; a secret shorter than 16 characters is
ignored. Env-configured webhooks have no card in the UI and no activity
log — a signed `ping` returning `{"ok": true}` is the test that they work.
Never commit real values: keep them in `.env` / your secrets manager, not
in the repo. The encryption key for UI-stored secrets is
`INTEGRATION_SECRET_KEY` (see `docs/INTEGRATIONS.md`).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `401 Invalid webhook signature` on every delivery | Secret differs between RestroOS and the aggregator; or the signature was computed over re-serialised JSON instead of the exact bytes sent | Re-copy the secret from step 2 into the aggregator; sign `timestamp + "." + rawBody` with the exact bytes |
| `401` only sometimes | Clock skew: the timestamp header is more than 5 minutes off | Fix the sender's clock / NTP; the window is 5 minutes |
| `400 Invalid payload` | Body is not the canonical format (e.g. the aggregator's native payload was forwarded unchanged) | Add the mapping in the aggregator or mapping script (step 3.3) |
| `422 Items not found on the menu: …` | Dish name on the platform does not match any RestroOS menu item (or the item is in a category hidden from the website) | Rename to match, or map to `menuItemId` |
| `422 branchId is required…` | Restaurant has several branches and the event did not say which | Send `branchId` in every event |
| `422 delivery.address is required…` | `type` is `DELIVERY` (the default) but no `delivery` object was sent | Send `delivery.address`, or set `type: "TAKEAWAY"` |
| Ping works, orders never arrive | Card disabled; wrong `restaurantId` in the URL; aggregator pointing at a different URL | Check the card is Enabled, copy the URL from the card itself, check the aggregator's delivery log |
| Card never turns Connected | No signed delivery has arrived yet (saving the secret does not do it) | Send a `ping` from the aggregator |
| Duplicate orders in the kitchen | The aggregator is sending the same platform order under different `orderId`s | Give RestroOS one stable `orderId` per platform order; idempotency keys on `(branch, source, orderId)` |

## What is still manual (not built)

- **No status sync back.** Accepting / rejecting / marking ready in
  RestroOS does not tell Zomato, Swiggy or the aggregator. Staff still
  confirm status inside the platform or aggregator. Building that needs
  each platform's outbound API and sandbox access — there is no public
  Zomato/Swiggy order API to call today.
- **No menu sync.** Dish names / ids must be kept in step by hand (or in
  the aggregator's mapping) on both sides.
- **No native aggregator payload support.** RestroOS speaks one canonical
  signed format; each aggregator's native format needs the mapping
  described in step 3.3.

## Reference

- Technical contract: `docs/INTEGRATIONS.md` ("Zomato, Swiggy and
  aggregators"), `apps/backend/src/integration-hub/aggregator-orders.service.ts`
  (canonical payload, signature, idempotency), `apps/backend/src/integration-hub/providers/registry.ts`
  (provider registration), `apps/backend/src/integration-hub/aggregator-config.ts`
  (environment-variable fallback).
- Tests: `apps/backend/test/aggregator-webhook.e2e-spec.ts` (run with a
  database: `AGG_E2E=1 … npx jest --config ./test/jest-e2e.json --runInBand
  aggregator-webhook`), `apps/backend/src/integration-hub/aggregator-config.spec.ts`.
