import { z } from 'zod';

export const SERVICE_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'THB', 'SGD'] as const;
export type ServiceCurrency = (typeof SERVICE_CURRENCIES)[number];

function trimOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed === '' ? null : trimmed;
}

const requiredText = (message: string, max = 200) =>
  z.preprocess(
    (v) => (v == null ? '' : typeof v === 'string' ? v : String(v)),
    z.string().trim().min(1, message).max(max),
  );

const optionalText = (max = 2000) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => trimOrNull(v))
    .pipe(z.string().max(max, `Cannot exceed ${max} characters`).nullable());

const optionalCuid = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => trimOrNull(v));

const optionalNumber = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isNaN(n) ? null : n;
  })
  .pipe(z.number().nonnegative('Cost must be 0 or greater').nullable());

const optionalDate = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null || v === '') return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  })
  .pipe(z.date().nullable());

const billingCycleField = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    const t = trimOrNull(v);
    if (t === 'monthly' || t === 'quarterly' || t === 'yearly') return t;
    return null;
  });

const subscriptionRefinement = (
  data: {
    type: 'subscription' | 'usage';
    billingCycle: 'monthly' | 'quarterly' | 'yearly' | null;
    fixedCost: number | null;
    nextRenewal: Date | null;
  },
  ctx: z.RefinementCtx,
) => {
  if (data.type === 'subscription') {
    if (data.billingCycle == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['billingCycle'],
        message: 'Billing cycle is required',
      });
    }
    if (data.fixedCost == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fixedCost'],
        message: 'Fixed cost is required',
      });
    }
    if (data.nextRenewal == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nextRenewal'],
        message: 'Next renewal is required',
      });
    }
  }
};

const baseShape = {
  vendorId: optionalCuid,
  displayName: requiredText('Display name is required', 200),
  type: z.enum(['subscription', 'usage'], { message: 'Choose a service type' }),
  billingCycle: billingCycleField,
  fixedCost: optionalNumber,
  currency: z.enum(SERVICE_CURRENCIES, { message: 'Currency is required' }),
  nextRenewal: optionalDate,
  ownerUserId: optionalCuid,
  notes: optionalText(2000),
};

export const createServiceSchema = z.object(baseShape).superRefine(subscriptionRefinement);

export const updateServiceSchema = z
  .object({
    vendorId: baseShape.vendorId.optional(),
    displayName: baseShape.displayName.optional(),
    type: baseShape.type.optional(),
    billingCycle: baseShape.billingCycle.optional(),
    fixedCost: baseShape.fixedCost.optional(),
    currency: baseShape.currency.optional(),
    nextRenewal: baseShape.nextRenewal.optional(),
    ownerUserId: baseShape.ownerUserId.optional(),
    notes: baseShape.notes.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === undefined) return;
    subscriptionRefinement(
      {
        type: data.type,
        billingCycle: data.billingCycle ?? null,
        fixedCost: data.fixedCost ?? null,
        nextRenewal: data.nextRenewal ?? null,
      },
      ctx,
    );
  });

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
