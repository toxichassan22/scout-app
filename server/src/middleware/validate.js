import { z } from 'zod/v3';

function normalizeSchema(schema, part, strictBody = false) {
  if (schema && typeof schema.safeParseAsync === 'function') return schema;
  if (schema && typeof schema === 'object') {
    const obj = z.object(schema);
    return part === 'body' && strictBody ? obj.strict() : obj;
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
          const issues = result.error.issues || result.error.errors || [];
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

export const zString = (name, { min = 1, max = 256, optional = false } = {}) => {
  let schema = z.string({ required_error: `${name} مطلوب`, invalid_type_error: `${name} يجب أن يكون نصاً` });
  if (min > 0) schema = schema.min(min, { message: `${name} قصير جداً` });
  if (max < Infinity) schema = schema.max(max, { message: `${name} طويل جداً` });
  return optional ? schema.optional() : schema;
};

export const zId = (name = 'id') => z.string({ required_error: `${name} مطلوب`, invalid_type_error: `${name} يجب أن يكون نصاً` }).uuid(`${name} يجب أن يكون UUID`).or(z.string().length(24, `${name} غير صالح`));

export const zNumber = (name, { min, max, int = false, optional = false } = {}) => {
  let schema = z.coerce.number({ invalid_type_error: `${name} يجب أن يكون رقماً` });
  if (int) schema = schema.int(`${name} يجب أن يكون عدد صحيح`);
  if (min !== undefined) schema = schema.min(min, `${name} أقل من الحد الأدنى`);
  if (max !== undefined) schema = schema.max(max, `${name} أكبر من الحد الأقصى`);
  return optional ? schema.optional() : schema;
};

export const zBoolean = (name, { optional = false } = {}) => {
  let schema = z.coerce.boolean({ invalid_type_error: `${name} يجب أن يكون true/false` });
  return optional ? schema.optional() : schema;
};
