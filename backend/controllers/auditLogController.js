const AuditLog = require('../models/AuditLog');
const Event = require('../models/Event');
const { getOrganizerId, findOwnedEvent } = require('../utils/tenant');

exports.getEventAuditLogs = async (req, res) => {
  try {
    const event = req.user?.role === 'admin'
      ? await Event.findById(req.params.eventId)
      : await findOwnedEvent(req, req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const organizerId = req.user?.role === 'admin' ? event.organizerId : getOrganizerId(req);

    const logs = await AuditLog.find({
      organizerId,
      eventId: event._id,
    }).sort({ createdAt: -1 }).limit(250);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createEventAuditLog = async (req, res) => {
  try {
    const event = await findOwnedEvent(req, req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const { category, action, message, changes = [], metadata = {} } = req.body;
    if (!category || !action || !message) {
      return res.status(400).json({ message: 'category, action and message are required' });
    }

    const log = await AuditLog.create({
      organizerId: getOrganizerId(req),
      eventId: event._id,
      userId: req.user._id,
      userName: req.user.name || req.user.email || 'Unknown user',
      category,
      action,
      message,
      changes: Array.isArray(changes) ? changes : [],
      metadata,
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
