/**
 * AUTH MIDDLEWARE — JWT authentication + role-based authorization (RBAC).
 *
 * Key concepts: protect() reads a Bearer token from the Authorization header OR a `token`
 * cookie, verifies it with JWT_SECRET, loads the user (password excluded) onto req.user, and
 * rejects deactivated accounts (403); it maps JsonWebTokenError/TokenExpiredError to 401.
 * authorize(...roles) is a factory returning a guard that 403s unless req.user.role is allowed,
 * so routes compose protect then authorize('admin') etc.
 * Viva line: "protect proves who you are; authorize decides what your role may do."
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// Protect routes - verify JWT token
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized - no token' });
    }

    // Verify signature+expiry; throws on tamper/expiry (caught below -> 401).
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };

    // Re-fetch the user each request so role/isActive are always current (not stale in the token).
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized - user not found' });
    }

    // Security guard: a soft-deleted/banned account keeps a valid token but is still blocked.
    if (!req.user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    next();
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Not authorized - invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Not authorized - token expired' });
    }
    next(err);
  }
};

// Authorize by role
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};
