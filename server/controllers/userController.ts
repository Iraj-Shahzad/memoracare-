/**
 * USER CONTROLLER — admin user management plus self-service profile reads/updates.
 *
 * Key concepts: getAllUsers is admin-facing with optional role filter, case-insensitive
 * $regex search over name/email, and skip/limit pagination; getUser and updateUser enforce
 * an ownership check (admin OR the user themselves) to prevent IDOR, and only an admin may
 * flip isActive (activate/deactivate). createUser is admin-only and, unlike public
 * /auth/register, may create ANY role — it creates the User (password hashed by the model's
 * pre-save hook) AND the matching role profile (Patient/Caregiver) so the account works
 * end-to-end. deleteUser cascades by removing the linked role profile before the User.
 * Viva line: "Admins manage all users while normal users can only read/update their own
 * record, and creating a user also provisions its role profile in one step."
 */
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Patient from '../models/Patient';
import Caregiver from '../models/Caregiver';

// @desc Get all users (admin)
// @route GET /api/users
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const query: any = {};

    if (role) query.role = role;
    if (search) {
      // Case-insensitive partial match across name OR email.
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: users.length, total, page: Number(page), users });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get single user
// @route GET /api/users/:id
export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only an admin, or the user themselves, may read a user record.
    const requesterId = (req.user.id || req.user._id).toString();
    if (req.user.role !== 'admin' && req.params.id !== requesterId) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this user' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user });
  } catch (err: any) {
    next(err);
  }
};

// @desc Update user
// @route PUT /api/users/:id
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only an admin, or the user themselves, may update a user record.
    const requesterId = (req.user.id || req.user._id).toString();
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && req.params.id !== requesterId) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this user' });
    }

    const { name, phone, avatar, isActive } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;
    // Only an admin may activate/deactivate an account.
    if (isActive !== undefined && isAdmin) updateData.isActive = isActive;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user });
  } catch (err: any) {
    next(err);
  }
};

// @desc Delete user
// @desc  Create a user (admin only)
// @route POST /api/users
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    // Admins may create any role (unlike public /auth/register which blocks admin).
    const validRoles = ['patient', 'caregiver', 'admin'];
    const safeRole = validRoles.includes(role) ? role : 'patient';
    const emailLc = String(email).toLowerCase();

    const existing = await User.findOne({ email: emailLc });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Password is hashed by the User model's pre-save hook.
    const user = await User.create({ name, email: emailLc, password, phone, role: safeRole });

    // Create the matching role profile so the account works end-to-end
    // (a patient needs a Patient doc, a caregiver a Caregiver doc; admin needs neither).
    if (safeRole === 'patient') await Patient.create({ user: user._id });
    else if (safeRole === 'caregiver') await Caregiver.create({ user: user._id });

    res.status(201).json({
      success: true,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, isActive: user.isActive },
    });
  } catch (err: any) {
    next(err);
  }
};

// @desc Delete user (admin)
// @route DELETE /api/users/:id
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Also remove associated profile
    if (user.role === 'patient') {
      await Patient.findOneAndDelete({ user: user._id });
    } else if (user.role === 'caregiver') {
      await Caregiver.findOneAndDelete({ user: user._id });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get user stats (admin)
// @route GET /api/users/stats
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalUsers = await User.countDocuments();
    const patients = await User.countDocuments({ role: 'patient' });
    const caregivers = await User.countDocuments({ role: 'caregiver' });
    const admins = await User.countDocuments({ role: 'admin' });
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    // New users in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    res.status(200).json({
      success: true,
      stats: { totalUsers, patients, caregivers, admins, activeUsers, inactiveUsers, newUsers },
    });
  } catch (err: any) {
    next(err);
  }
};
