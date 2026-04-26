import { z } from 'zod';

const formatPath = (path) => {
  if (!Array.isArray(path) || path.length === 0) return 'body';
  return path.join('.');
};

const formatZodErrors = (issues) => issues.map((issue) => ({
  field: formatPath(issue.path),
  message: issue.message,
}));

const validate = (schema, data, source, res, next, assignParsed) => {
  const result = schema.safeParse(data);

  if (!result.success) {
    return res.status(400).json({
      message: `Invalid ${source} payload`,
      errors: formatZodErrors(result.error.issues),
    });
  }

  assignParsed(result.data);
  return next();
};

export const validateBody = (schema) => (req, res, next) => validate(
  schema,
  req.body,
  'request',
  res,
  next,
  (parsedData) => {
    req.body = parsedData;
  },
);

export const validateQuery = (schema) => (req, res, next) => validate(
  schema,
  req.query,
  'query',
  res,
  next,
  (parsedData) => {
    req.query = parsedData;
  },
);

export const validateParams = (schema) => (req, res, next) => validate(
  schema,
  req.params,
  'params',
  res,
  next,
  (parsedData) => {
    req.params = parsedData;
  },
);

export { z };
