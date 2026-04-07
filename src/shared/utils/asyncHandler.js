/**
 * Wraps an async Express handler and forwards errors to next().
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
