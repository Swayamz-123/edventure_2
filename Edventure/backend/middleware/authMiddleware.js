import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Middleware to verify JWT Access Token from HTTP-Only Cookie or Authorization Header
 */
export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return next(new ApiError(401, 'Unauthorized request: No access token provided'));
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select('-password');
    if (!user) {
      return next(new ApiError(401, 'Invalid Access Token: User no longer exists'));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new ApiError(401, error?.message || 'Invalid or expired Access Token'));
  }
});

/**
 * Role-Based Access Control (RBAC) Guard
 * Ensures the authenticated user has one of the allowed roles (e.g. 'admin')
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Unauthorized: Authentication required'));
    }

    const userRole = req.user.role || 'student';

    if (!allowedRoles.includes(userRole)) {
      return next(
        new ApiError(
          403,
          `Access Forbidden: Role '${userRole}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
};

export default verifyJWT;
