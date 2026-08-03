import { ApiError } from '../utils/apiError.js';

// validate({ body, params, query }) — each is a zod schema (optional).
// On success, replaces req.* with the parsed (coerced) value.
export function validate(schemas) {
  return (req, _res, next) => {
    try {
      for (const key of ['body', 'params', 'query']) {
        if (schemas[key]) {
          const result = schemas[key].safeParse(req[key]);
          if (!result.success) {
            throw ApiError.badRequest('Validation failed', result.error.flatten());
          }
          req[key] = result.data;
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
