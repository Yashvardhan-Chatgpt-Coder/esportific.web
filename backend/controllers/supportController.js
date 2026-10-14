const SupportRequest = require("../models/SupportRequest");

const SUPPORT_SUBJECTS = new Set([
  "Account & billing",
  "Events and teams",
  "Technical issue",
  "Suggestions",
  "Other",
]);

function clean(value) {
  return String(value || "").trim();
}

exports.createSupportRequest = async (req, res) => {
  try {
    const name = clean(req.body.name);
    const email = clean(req.body.email).toLowerCase();
    const subject = clean(req.body.subject);
    const message = clean(req.body.message);

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "Name, email, subject, and message are required." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    if (!SUPPORT_SUBJECTS.has(subject)) {
      return res.status(400).json({ message: "Select a valid support subject." });
    }

    const supportRequest = await SupportRequest.create({
      userId: req.user?._id || null,
      name,
      email,
      subject,
      message,
    });

    res.status(201).json(supportRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
