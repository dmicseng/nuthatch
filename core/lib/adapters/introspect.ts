/**
 * Best-effort introspection of a Zod schema into form metadata. Sufficient for
 * the credential schemas we have today (flat objects of optional/required strings).
 * Each adapter's credentialSchema is expected to be a `z.object({...})` whose
 * shape is mostly ZodString or ZodOptional<ZodString>.
 */
import { z } from 'zod';

export type CredentialFieldMeta = {
  name: string;
  required: boolean;
  inputType: 'text' | 'password';
  description?: string;
  minLength?: number;
};

const SECRET_NAME_RE = /key|secret|token|password/i;

function unwrap(def: z.ZodTypeAny): { inner: z.ZodTypeAny; optional: boolean; description?: string } {
  let inner = def;
  let optional = false;
  const description = def.description;
  while (inner instanceof z.ZodOptional || inner instanceof z.ZodNullable) {
    optional = true;
    inner = inner._def.innerType;
  }
  if (inner instanceof z.ZodDefault) {
    optional = true;
    inner = inner._def.innerType;
  }
  return { inner, optional, description: description ?? inner.description };
}

export function introspectCredentialSchema(schema: z.ZodType): CredentialFieldMeta[] {
  if (!(schema instanceof z.ZodObject)) return [];
  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  const fields: CredentialFieldMeta[] = [];
  for (const [name, def] of Object.entries(shape)) {
    const { inner, optional, description } = unwrap(def);
    if (!(inner instanceof z.ZodString)) continue;
    let minLength: number | undefined;
    for (const check of inner._def.checks ?? []) {
      if (check.kind === 'min') minLength = check.value;
    }
    fields.push({
      name,
      required: !optional,
      inputType: SECRET_NAME_RE.test(name) ? 'password' : 'text',
      description,
      minLength,
    });
  }
  return fields;
}
