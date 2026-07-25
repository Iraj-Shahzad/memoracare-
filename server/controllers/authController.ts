import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Patient from '../models/Patient';
import Caregiver from '../models/Caregiver';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const generateToken = (id: any) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  } as any);
};

// @desc Register user
// @route POST /api/auth/register
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // SECURITY: public self-registration may only create a patient or caregiver.
    // Admin accounts must be provisioned separately, never through this open route,
    // otherwise anyone could register with role "admin".
    const safeRole = role === 'caregiver' ? 'caregiver' : 'patient';

    // Create user
    const user = await User.create({ name, email, password, phone, role: safeRole });

    // Create role-specific profile
    if (safeRole === 'patient') {
      await Patient.create({ user: user._id });
    } else if (safeRole === 'caregiver') {
      await Caregiver.create({ user: user._id });
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    });
  } catch (err: any) {
    next(err);
  }
};

// @desc Login user
// @route POST /api/auth/login
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Emails are stored lowercase, so normalise the lookup (e.g. Iraj@gmail.com).
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, avatar: user.avatar },
    });
  } catch (err: any) {
    next(err);
  }
};

// @desc  Sign in / sign up with Google
// @route POST /api/auth/google
export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Missing Google credential' });
    }

    // Verify the Google ID token with Google's public tokeninfo endpoint.
    const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!resp.ok) {
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }
    const payload: any = await resp.json();

    // Ensure the token was issued for THIS app (guards against token reuse).
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && payload.aud !== clientId) {
      return res.status(401).json({ success: false, message: 'Google token audience mismatch' });
    }
    if (payload.email_verified === 'false') {
      return res.status(401).json({ success: false, message: 'Google email is not verified' });
    }

    const email = (payload.email || '').toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account has no email' });
    }

    // Find the user, or create one (new Google sign-ups become patients).
    let user: any = await User.findOne({ email });
    if (!user) {
      const randomPassword = crypto.randomBytes(24).toString('hex');
      user = await User.create({
        name: payload.name || email.split('@')[0],
        email,
        password: randomPassword,
        role: 'patient',
        avatar: payload.picture,
        isActive: true,
      });
      await Patient.create({ user: user._id });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, avatar: user.avatar },
    });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get current user
// @route GET /api/auth/me
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user.id);
    let profile = null;

    if (user.role === 'patient') {
      profile = await Patient.findOne({ user: user._id });
    } else if (user.role === 'caregiver') {
      profile = await Caregiver.findOne({ user: user._id }).populate('assignedPatients');
    }

    res.status(200).json({ success: true, user, profile });
  } catch (err: any) {
    next(err);
  }
};

// @desc Logout user
// @route POST /api/auth/logout
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.clearCookie('token');
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    next(err);
  }
};

// @desc Change password
// @route PUT /api/auth/change-password
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword; // hashed by the pre-save hook
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    next(err);
  }
};
