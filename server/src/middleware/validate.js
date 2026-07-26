import { z } from 'zod';

function normalizeSchema(schema, part, strictBody = true) {
  if (schema && typeof schema.safeParseAsync === 'function') return schema;
  if (schema && typeof schema === 'object') {
    if (part === 'body' && strictBody) return z.strictObject(schema);
    return z.object(schema);
  }
  return schema;
}

export function validate(schemas, options = {}) {
  const normalized = {
    body: normalizeSchema(schemas.body, 'body', options.strictBody),
    query: normalizeSchema(schemas.query, 'query'),
    params: normalizeSchema(schemas.params, 'params'),
  };

  return async (req, res, next) => {
    const parts = ['body', 'query', 'params'];
    const errors = [];
    try {
      for (const part of parts) {
        if (!schemas[part]) continue;
        const schema = normalized[part];
        const result = await schema.safeParseAsync(req[part]);
        if (!result.success) {
          const issues = result.error?.issues || [];
          errors.push(
            ...issues.map(e => ({
              field: e.path.join('.'),
              message: e.message,
              location: part,
            })),
          );
        } else if (options.coerce !== false) {
          req[part] = result.data;
        }
      }
      if (errors.length > 0) {
        const err = new Error('Validation failed');
        err.statusCode = 400;
        err.details = errors;
        return next(err);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

function preprocessNumber(value) {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return undefined;
    return Number(trimmed);
  }
  return value;
}

function preprocessBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
}

export const zString = (name, { min = 1, max = 256, optional = false } = {}) => {
  let schema = z.string({ message: `${name} يجب أن يكون نصاً` });
  if (min > 0) schema = schema.min(min, { message: `${name} قصير جداً` });
  if (max < Infinity) schema = schema.max(max, { message: `${name} طويل جداً` });
  return optional ? schema.optional() : schema;
};

export const zId = (name = 'id') => z.string({ message: `${name} يجب أن يكون نصاً` })
  .uuid({ message: `${name} يجب أن يكون UUID` })
  .or(z.string().length(24, { message: `${name} غير صالح` }));

export const zNumber = (name, { min, max, int = false, optional = false } = {}) => {
  let inner = z.number({ message: `${name} يجب أن يكون رقماً` });
  if (int) inner = inner.int({ message: `${name} يجب أن يكون عدد صحيح` });
  if (min !== undefined) inner = inner.min(min, { message: `${name} أقل من الحد الأدنى` });
  if (max !== undefined) inner = inner.max(max, { message: `${name} أكبر من الحد الأقصى` });
  if (optional) inner = inner.optional();
  return z.preprocess(preprocessNumber, inner);
};

export const zBoolean = (name, { optional = false } = {}) => {
  const inner = optional
    ? z.boolean({ message: `${name} يجب أن يكون true/false` }).optional()
    : z.boolean({ message: `${name} يجب أن يكون true/false` });
  return z.preprocess(preprocessBoolean, inner);
};
