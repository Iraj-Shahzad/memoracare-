const Contact = require('../models/Contact');

// @desc Submit a contact form (public, no auth needed)
// @route POST /api/contact
exports.submitContact = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

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
  } catch (err) {
    next(err);
  }
};

// @desc Get all contact submissions (admin only)
// @route GET /api/contact
exports.getAllContacts = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const total = await Contact.countDocuments(query);
    const contacts = await Contact.find(query)
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, count: contacts.length, total, contacts });
  } catch (err) {
    next(err);
  }
};

// @desc Update contact status (admin only)
// @route PUT /api/contact/:id
exports.updateContact = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const updateData = {};
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
  } catch (err) {
    next(err);
  }
};

// @desc Delete a contact submission (admin only)
// @route DELETE /api/contact/:id
exports.deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact submission not found' });
    }
    res.status(200).json({ success: true, message: 'Contact submission deleted' });
  } catch (err) {
    next(err);
  }
};
