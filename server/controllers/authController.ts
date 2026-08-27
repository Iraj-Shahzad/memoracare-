/**
 * AUTH CONTROLLER — all authentication + account lifecycle endpoints for MemoryCare.
 *
 * Key concepts: JWT signing (generateToken signs { id } with JWT_SECRET, 7d expiry);
 * bcrypt password check via user.matchPassword and hashing done by the model's pre-save
 * hook (we assign the plain password and .save() re-hashes it); role-escalation guard on
 * register (public signup is forced to patient/caregiver, never admin); Google id_token
 * verified against Google's tokeninfo endpoint with an aud (audience) check to stop token
 * reuse; forgot/reset flow stores only the SHA-256 hash of a 30-minute token and returns
 * an identical generic reply on every path to prevent account enumeration.
 * Viva line: "We never trust the client for role or identity — signup can't self-grant admin,
 * Google tokens are re-verified server-side, and reset tokens are stored hashed with a short expiry."
 */
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Patient from '../models/Patient';
import Caregiver from '../models/Caregiver';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendMail, emailLayout } from '../utils/mailer';

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

    // Welcome email (best-effort; no-op if SMTP isn't configured).
    sendMail({
      to: user.email,
      subject: 'Welcome to MemoryCare',
      html: emailLayout(`Welcome, ${user.name}!`,
        `<p>Your MemoryCare account has been created as a <b>${safeRole}</b>.</p>
         <p>You can now sign in and start using the app. If you didn't create this account, please ignore this email.</p>`),
    }).catch(() => {});

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
    // The token can outlive the account (deleted user, dropped database). Without
    // this guard the next line throws and the client gets a 500 instead of being
    // told to sign in again.
    if (!user) {
      return res.status(401).json({ success: false, message: 'Your session is no longer valid. Please sign in again.' });
    }
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

// @desc Delete my own account (and its role profile)
// @route DELETE /api/auth/me
export const deleteMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    await Patient.deleteOne({ user: userId }).catch(() => {});
    await Caregiver.deleteOne({ user: userId }).catch(() => {});
    await User.findByIdAndDelete(userId);
    res.status(200).json({ success: true, message: 'Account deleted' });
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

// @desc  Request a password-reset link (emails a one-time link)
// @route POST /api/auth/forgot-password
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide your email address' });
    }

    // Generic reply used in EVERY outcome below so we never reveal whether an
    // email is registered (prevents account enumeration).
    const genericMsg = 'If an account exists for that email, a password reset link has been sent.';

    const user: any = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({ success: true, message: genericMsg });
    }

    // Create + store the reset token, then build the link for the frontend.
    const rawToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${clientUrl}/reset-password/${rawToken}`;

    const emailResult = await sendMail({
      to: user.email,
      subject: 'Reset your MemoryCare password',
      html: emailLayout('Password reset requested',
        `<p>Hi ${user.name},</p>
         <p>We received a request to reset your MemoryCare password. Click the button below to choose a new password. This link expires in <b>30 minutes</b>.</p>
         <p style="margin:24px 0">
           <a href="${resetUrl}" style="background:#0d9488;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Reset Password</a>
         </p>
         <p style="color:#64748b;font-size:13px">If the button doesn't work, copy this link into your browser:<br>${resetUrl}</p>
         <p style="color:#64748b;font-size:13px">If you didn't request this, you can safely ignore this email — your password won't change.</p>`),
    });

    // If SMTP isn't set up, the link can't be delivered. Roll back the token so
    // a stale one isn't left on the account, and tell the caller honestly.
    if (emailResult && (emailResult as any).skipped) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(503).json({
        success: false,
        message: 'Email delivery is not configured on the server, so a reset link cannot be sent. Please contact your administrator.',
      });
    }

    res.status(200).json({ success: true, message: genericMsg });
  } catch (err: any) {
    next(err);
  }
};

// @desc  Reset the password using a token from the emailed link
// @route PUT /api/auth/reset-password/:token
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Hash the incoming raw token the same way we stored it, then match on both
    // the hash AND a not-yet-expired deadline.
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user: any = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpire: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired. Please request a new one.' });
    }

    user.password = password; // hashed by the pre-save hook
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Confirmation email (best-effort).
    sendMail({
      to: user.email,
      subject: 'Your MemoryCare password was changed',
      html: emailLayout('Password changed',
        `<p>Hi ${user.name},</p>
         <p>Your MemoryCare password was just changed. If this was you, no action is needed.</p>
         <p style="color:#64748b;font-size:13px">If you did NOT change your password, please contact your administrator immediately.</p>`),
    }).catch(() => {});

    res.status(200).json({ success: true, message: 'Your password has been reset. You can now sign in with your new password.' });
  } catch (err: any) {
    next(err);
  }
};
