/**
 * CONTACT CONTROLLER — the public "Contact Us" form plus admin triage of submissions.
 *
 * Key concepts: submitContact is a PUBLIC route (no auth middleware) that persists a Contact
 * document and returns only a minimal, non-sensitive echo (id, name, subject); the remaining
 * endpoints are admin-only (enforced by route middleware, not here) — getAllContacts supports
 * status filtering + pagination, updateContact stamps resolvedBy = req.user.id when marked
 * resolved, and deleteContact hard-removes a submission.
 * Viva line: "The contact form is the one open write endpoint — it stores the message and only
 * echoes back non-sensitive fields; everything after that is admin-gated."
 */
import { Request, Response, NextFunction } from 'express';
import Contact from '../models/Contact';

// @desc Submit a contact form (public, no auth needed)
// @route POST /api/contact
export const submitContact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // This is the one PUBLIC write endpoint, so validate the key fields here
    // (there is no auth/express-validator layer in front of it).
    if (!name || !name.trim() || !message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Name and message are required' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    const contact = await Contact.create({
      name,
      email,
      phone,
      subject,
      message,
    });

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you within 24 hours.',
      contact: { id: contact._id, name: contact.name, subject: contact.subject },
    });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get all contact submissions (admin only)
// @route GET /api/contact
export const getAllContacts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query: any = {};
    if (status) query.status = status;

    const total = await Contact.countDocuments(query);
    const contacts = await Contact.find(query)
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({ success: true, count: contacts.length, total, contacts });
  } catch (err: any) {
    next(err);
  }
};

// @desc Update contact status (admin only)
// @route PUT /api/contact/:id
export const updateContact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, adminNotes } = req.body;
    const updateData: any = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (status === 'resolved') updateData.resolvedBy = req.user.id;

    const contact = await Contact.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact submission not found' });
    }

    res.status(200).json({ success: true, contact });
  } catch (err: any) {
    next(err);
  }
};

// @desc Delete a contact submission (admin only)
// @route DELETE /api/contact/:id
export const deleteContact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact submission not found' });
    }
    res.status(200).json({ success: true, message: 'Contact submission deleted' });
  } catch (err: any) {
    next(err);
  }
};
