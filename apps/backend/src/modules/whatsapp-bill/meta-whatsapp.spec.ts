import { createHmac } from 'node:crypto';
import {
  buildMetaTemplatePayload,
  MetaWhatsAppCloudApiProvider,
} from './meta-whatsapp-cloud-api.provider';
import type { BillSendInput } from './bill-sender.interface';
import type { WhatsAppBillConfig } from './whatsapp-bill.config';
import {
  nextBillSendStatus,
  verifyMetaSignature,
} from './whatsapp-bill-webhook.service';

const input: BillSendInput = {
  to: '919876543210',
  bill: {
    orderNumber: '42',
    restaurantName: 'Test Kitchen',
    branchName: null,
    currency: 'INR',
    billedAt: '2026-11-25T10:00:00.000Z',
    customerName: 'Asha',
    items: [],
    subtotal: 100,
    discountAmount: 0,
    taxAmount: 0,
    tipAmount: 0,
    totalAmount: 100,
    amountPaid: 100,
    balanceDue: 0,
    payments: [],
    isProvisional: false,
  },
  message: '*Test Kitchen*\nTotal: INR 100.00',
};

describe('Meta template payload', () => {
  it('sends one template with the bill as the single body parameter', () => {
    expect(
      buildMetaTemplatePayload(input, 'restroos_bill', 'en'),
    ).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '919876543210',
      type: 'template',
      template: {
        name: 'restroos_bill',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: input.message }],
          },
        ],
      },
    });
  });

  it('is not configured until phone id, token and template are all set', () => {
    const config = {
      phoneNumberId: '123',
      apiToken: undefined,
      templateName: 'restroos_bill',
    } as unknown as WhatsAppBillConfig;
    expect(
      new MetaWhatsAppCloudApiProvider(config).isConfigured(),
    ).toBe(false);
    const full = {
      phoneNumberId: '123',
      apiToken: 'tok',
      templateName: 'restroos_bill',
    } as unknown as WhatsAppBillConfig;
    expect(new MetaWhatsAppCloudApiProvider(full).isConfigured()).toBe(true);
  });
});

describe('Meta webhook signature', () => {
  const secret = 'app_secret_abc';
  const body = Buffer.from('{"object":"whatsapp_business_account"}');
  const header =
    'sha256=' +
    createHmac('sha256', secret).update(body).digest('hex');

  it('verifies what Meta signed', () => {
    expect(verifyMetaSignature(secret, body, header)).toBe(true);
  });

  it('rejects a tampered body, wrong secret and malformed headers', () => {
    expect(
      verifyMetaSignature(secret, Buffer.from('{}'), header),
    ).toBe(false);
    expect(verifyMetaSignature('other', body, header)).toBe(false);
    expect(verifyMetaSignature(secret, body, 'garbage')).toBe(false);
    expect(verifyMetaSignature(secret, body, undefined)).toBe(false);
  });
});

describe('bill send status transitions', () => {
  it('moves forward only', () => {
    expect(nextBillSendStatus('QUEUED', 'SENT')).toBe('SENT');
    expect(nextBillSendStatus('SENT', 'DELIVERED')).toBe('DELIVERED');
    expect(nextBillSendStatus('DELIVERED', 'READ')).toBe('READ');
    expect(nextBillSendStatus('DELIVERED', 'SENT')).toBe(null);
    expect(nextBillSendStatus('SENT', 'SENT')).toBe(null);
  });

  it('lets a failure land, but never after READ or FAILED', () => {
    expect(nextBillSendStatus('SENT', 'FAILED')).toBe('FAILED');
    expect(nextBillSendStatus('READ', 'FAILED')).toBe(null);
    expect(nextBillSendStatus('FAILED', 'DELIVERED')).toBe(null);
    expect(nextBillSendStatus('READ', 'DELIVERED')).toBe(null);
  });
});
