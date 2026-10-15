import { ApiError } from '../utils/ApiError.js';

/**
 * Express error-handling middleware that catches all errors thrown
 * or passed via next(new ApiError(...)) and returns a standardized JSON response.
 */
export const errorMiddleware = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' || error.code === 11000 ? 400 : 500);
    const message = error.message || 'Something went wrong';
    error = new ApiError(statusCode, message, error.errors || [], error.stack);
  }

  res.status(error.statusCode).json({
    statusCode: error.statusCode,
    data: error.data,
    success: false,
    message: error.message,
    errors: error.errors
  });
};

export default errorMiddleware;
