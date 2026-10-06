export function errorHandler(err, _req, res, _next) {
  const status = err.status || 400
  res.status(status).json({
    error: true,
    message: err.message || 'Request failed',
    code: err.code || 'BAD_REQUEST',
  })
}
