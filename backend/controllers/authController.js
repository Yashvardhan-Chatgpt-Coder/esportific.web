const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Otp = require("../models/Otp");
const PasswordResetOtp = require("../models/PasswordResetOtp");
const PasswordResetSession = require("../models/PasswordResetSession");
const { Resend } = require("resend");
const cloudinary = require("../config/cloudinary");
const { CLOUDINARY_FOLDERS } = require("../utils/cloudinaryFolders");
const { changed, createUserLog, requestContext } = require("../utils/userLogs");
const { invalidateUserAuthCache } = require("../middleware/authMiddleware");

// Instantiate Resend with API Key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);
const otpSender = process.env.RESEND_FROM_EMAIL || "Esportific <noreply.esportific@rangrove.com>";
const otpEmailTemplate = fs.readFileSync(path.join(__dirname, "../templates/otp-verification.html"), "utf8");
const googleOAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const hashResetValue = (value) => crypto.createHash("sha256").update(value).digest("hex");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function renderOtpEmail({ otp, title, preheader, heading, description }) {
  return otpEmailTemplate
    .replace(/\{\{OTP\}\}/g, otp)
    .replace(/\{\{EMAIL_TITLE\}\}/g, title)
    .replace(/\{\{EMAIL_PREHEADER\}\}/g, preheader)
    .replace(/\{\{EMAIL_HEADING\}\}/g, heading)
    .replace(/\{\{EMAIL_DESCRIPTION\}\}/g, description);
}

// Persistent sessions have no time-based expiry. They are revoked when the user
// explicitly logs out, and remain valid across browser/app restarts.
const generateToken = (id, sessionId) => {
  return jwt.sign({ id, sid: sessionId }, process.env.JWT_SECRET);
};

async function createSessionToken(user) {
  const sessionId = crypto.randomBytes(32).toString("hex");
  await User.updateOne(
    { _id: user._id },
    { $push: { authSessions: { sessionId, createdAt: new Date() } } },
  );
  invalidateUserAuthCache(user._id);
  return generateToken(user._id, sessionId);
};

function extractPublicId(url) {
  if (!url || !url.includes("res.cloudinary.com")) return null;
  const parts = url.split("/upload/");
  if (parts.length < 2) return null;

  let path = parts[1];
  const firstSlash = path.indexOf("/");
  if (path.startsWith("v") && firstSlash !== -1 && !isNaN(path.substring(1, firstSlash))) {
    path = path.substring(firstSlash + 1);
  }

  const lastDot = path.lastIndexOf(".");
  if (lastDot !== -1) {
    path = path.substring(0, lastDot);
  }

  return path;
}

async function uploadProfileLogo(file) {
  if (!file) return null;
  const b64 = Buffer.from(file.buffer).toString("base64");
  const dataURI = `data:${file.mimetype};base64,${b64}`;
  const result = await cloudinary.uploader.upload(dataURI, {
    folder: CLOUDINARY_FOLDERS.ORGANIZER_PROFILE_LOGOS,
    format: "webp",
    quality: "auto:good",
    transformation: [{ width: 256, height: 256, crop: "limit" }],
  });
  return result.secure_url;
}

async function deleteCloudinaryUrl(url) {
  const publicId = extractPublicId(url);
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId).catch((err) => {
    console.error("Failed to delete old profile logo from Cloudinary:", err);
  });
}

function userPayload(user, token = null) {
  const payload = {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    dob: user.dob || null,
    gender: user.gender || "Male",
    avatar: user.avatar || "",
    timezone: user.timezone || "Asia/Kolkata",
    organization: {
      name: user.organization?.name || user.name || "",
      logo: user.organization?.logo || "",
    },
    appearanceMode: user.appearanceMode || "light",
    integrations: {
      discordWebhookUrl: user.integrations?.discordWebhookUrl || "",
      twitchChannelUrl: user.integrations?.twitchChannelUrl || "",
    },
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  if (token) payload.token = token;
  return payload;
}

function parseJsonField(value, fallback) {
  if (value && typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

// @desc    Send dynamic OTP verification email using Resend
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide an email address" });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate a secure 6-digit OTP code
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Store/Update OTP document in database with automatic 5-min expiration
    await Otp.findOneAndUpdate(
      { email },
      { code: otp, createdAt: new Date() },
      { upsert: true, new: true },
    );

    const emailHtml = renderOtpEmail({
      otp,
      title: "Verify your Esportific account",
      preheader: `Your Esportific verification code is ${otp}.`,
      heading: "Verify your email",
      description: "Enter this code to verify your Esportific account.",
    });
    const { error: emailError } = await resend.emails.send({
      from: otpSender,
      to: email,
      subject: "Verify your Esportific account",
      html: emailHtml,
    });

    if (emailError) {
      await Otp.deleteOne({ email, code: otp });
      console.error("Resend OTP delivery failed:", emailError.message || "Unknown provider error");
      return res.status(502).json({ message: "Failed to send verification code. Please try again shortly." });
    }

    res.status(200).json({ message: "Verification code sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send verification code" });
  }
};

// @route POST /api/auth/password-reset/send-otp
// Always returns the same response to avoid exposing whether an email has an account.
const sendPasswordResetOtp = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim();
    if (!email || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const user = await User.findOne({ email: { $regex: `^${escapeRegex(email)}$`, $options: "i" } });
    if (!user || user.role !== "organizer") {
      return res.status(200).json({ message: "If an account exists for that email, a reset code is on its way." });
    }

    const canonicalEmail = user.email.toLowerCase();
    const previousOtp = await PasswordResetOtp.findOne({ email: canonicalEmail });
    if (previousOtp && Date.now() - previousOtp.createdAt.getTime() < 60_000) {
      return res.status(200).json({ message: "If an account exists for that email, a reset code is on its way." });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    await PasswordResetOtp.findOneAndUpdate(
      { email: canonicalEmail },
      { codeHash: hashResetValue(otp), attempts: 0, createdAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const { error: emailError } = await resend.emails.send({
      from: otpSender,
      to: user.email,
      subject: "Reset your Esportific password",
      html: renderOtpEmail({
        otp,
        title: "Reset your Esportific password",
        preheader: `Your Esportific password reset code is ${otp}.`,
        heading: "Reset your password",
        description: "Enter this code in Esportific to continue resetting your password.",
      }),
    });

    if (emailError) {
      await PasswordResetOtp.deleteOne({ email: canonicalEmail, codeHash: hashResetValue(otp) });
      console.error("Resend password-reset delivery failed:", emailError.message || "Unknown provider error");
    }
    return res.status(200).json({ message: "If an account exists for that email, a reset code is on its way." });
  } catch (error) {
    console.error("Could not send password-reset code:", error);
    return res.status(500).json({ message: "Could not send a reset code. Please try again shortly." });
  }
};

const verifyPasswordResetOtp = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();
    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Enter the email address and 6-digit code." });
    }

    const otpDoc = await PasswordResetOtp.findOne({ email });
    const isFresh = otpDoc && Date.now() - otpDoc.createdAt.getTime() < 5 * 60_000;
    if (!otpDoc || !isFresh) {
      return res.status(400).json({ message: "That code is invalid or has expired. Request a new one." });
    }

    const candidateHash = hashResetValue(otp);
    const matches = crypto.timingSafeEqual(Buffer.from(candidateHash, "hex"), Buffer.from(otpDoc.codeHash, "hex"));
    if (!matches) {
      const updated = await PasswordResetOtp.findOneAndUpdate(
        { _id: otpDoc._id },
        { $inc: { attempts: 1 } },
        { new: true },
      );
      if (updated && updated.attempts >= 5) await PasswordResetOtp.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ message: updated?.attempts >= 5 ? "Too many incorrect attempts. Request a new code." : "That code is incorrect." });
    }

    const consumedOtp = await PasswordResetOtp.findOneAndDelete({ _id: otpDoc._id, codeHash: candidateHash });
    if (!consumedOtp) return res.status(400).json({ message: "That code has already been used. Request a new one." });

    const resetToken = crypto.randomBytes(32).toString("hex");
    await PasswordResetSession.deleteMany({ email });
    await PasswordResetSession.create({
      email,
      tokenHash: hashResetValue(resetToken),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });
    return res.status(200).json({ resetToken, message: "Code verified. You can now choose a new password." });
  } catch (error) {
    console.error("Could not verify password-reset code:", error);
    return res.status(500).json({ message: "Could not verify the code. Please try again." });
  }
};

const completePasswordReset = async (req, res) => {
  try {
    const resetToken = String(req.body.resetToken || "");
    const newPassword = String(req.body.newPassword || "");
    if (!/^[a-f0-9]{64}$/i.test(resetToken)) return res.status(400).json({ message: "Your reset session is invalid. Request a new code." });
    if (newPassword.length < 6 || Buffer.byteLength(newPassword, "utf8") > 72) return res.status(400).json({ message: "Password must be at least 6 characters and no longer than 72 bytes." });

    const resetSession = await PasswordResetSession.findOneAndDelete({
      tokenHash: hashResetValue(resetToken),
      expiresAt: { $gt: new Date() },
    });
    if (!resetSession) return res.status(400).json({ message: "Your reset session has expired. Request a new code." });

    const user = await User.findOne({
      email: { $regex: `^${escapeRegex(resetSession.email)}$`, $options: "i" },
      role: "organizer",
    });
    if (!user) return res.status(400).json({ message: "This account can no longer reset its password." });

    const hashedPassword = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    user.password = hashedPassword;
    user.authSessions = [];
    await user.save();
    invalidateUserAuthCache(user._id);
    await PasswordResetOtp.deleteOne({ email: resetSession.email });
    await createUserLog(req, {
      userId: user._id,
      userName: user.name || user.email,
      actorId: user._id,
      actorName: user.name || user.email,
      category: "account",
      action: "password_reset",
      message: "Reset account password using email verification.",
    });
    return res.status(200).json({ message: "Password updated. Please sign in with your new password." });
  } catch (error) {
    console.error("Could not complete password reset:", error);
    return res.status(500).json({ message: "Could not update your password. Please try again." });
  }
};

// @desc    Register a new user (Organizer) with OTP verification
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;

    if (!name || !email || !password || !otp) {
      return res
        .status(400)
        .json({ message: "Please add all required fields including verification code" });
    }

    // Verify OTP code
    const otpDoc = await Otp.findOne({ email });
    if (!otpDoc || otpDoc.code !== otp) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user (MongoDB automatically assigns a unique _id)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      appearanceMode: "light",
      organization: {
        name,
        logo: "",
      },
    });

    if (user) {
      // Delete the OTP document as it is now successfully verified & used
      await Otp.deleteOne({ email });
      await createUserLog(req, {
        userId: user._id,
        userName: user.name || user.email,
        actorId: user._id,
        actorName: user.name || user.email,
        category: "account",
        action: "account_created",
        message: "Created account.",
        metadata: { email: user.email },
      });

      const token = await createSessionToken(user);
      res.status(201).json(userPayload(user, token));
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      if (user.role === "admin") {
        return res.status(403).json({ message: "Use the admin login page for admin access" });
      }
      const context = requestContext(req);
      await createUserLog(req, {
        userId: user._id,
        userName: user.name || user.email,
        actorId: user._id,
        actorName: user.name || user.email,
        category: "login",
        action: "logged_in",
        message: `Logged in from ${context.device}.`,
      });
      const token = await createSessionToken(user);
      res.json(userPayload(user, token));
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Log out current user
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
  try {
    if (req.authSessionId) {
      await User.updateOne(
        { _id: req.user._id },
        { $pull: { authSessions: { sessionId: req.authSessionId } } },
      );
      invalidateUserAuthCache(req.user._id);
    }
    if (req.user?.role !== "admin") {
      const context = requestContext(req);
      await createUserLog(req, {
        category: "login",
        action: "logged_out",
        message: `Logged out from ${context.device}.`,
      });
    }
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Authenticate an admin user
// @route   POST /api/auth/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid admin ID or password" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "This login is only for admin accounts" });
    }

    const token = await createSessionToken(user);
    return res.json(userPayload(user, token));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Authenticate or register an organizer with Google Identity Services
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  try {
    const { credential, intent = "login" } = req.body || {};
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return res.status(503).json({ message: "Google sign-in is not configured on the server" });
    }
    if (typeof credential !== "string" || !credential) {
      return res.status(400).json({ message: "Google did not return a sign-in credential" });
    }
    if (intent !== "login" && intent !== "signup") {
      return res.status(400).json({ message: "Invalid Google sign-in request" });
    }

    let googleAccount;
    try {
      const ticket = await googleOAuthClient.verifyIdToken({ idToken: credential, audience: clientId });
      googleAccount = ticket.getPayload();
    } catch {
      return res.status(401).json({ message: "Google sign-in could not be verified. Please try again." });
    }

    if (!googleAccount?.sub || !googleAccount.email || googleAccount.email_verified !== true) {
      return res.status(401).json({ message: "Use a Google account with a verified email address." });
    }

    const email = googleAccount.email.toLowerCase().trim();
    let user = await User.findOne({ googleId: googleAccount.sub });
    let created = false;

    if (!user) {
      user = await User.findOne({ email });
      if (user?.googleId && user.googleId !== googleAccount.sub) {
        return res.status(409).json({ message: "This email is linked to a different Google account." });
      }

      if (!user && intent === "login") {
        return res.status(404).json({ message: "No account found. Please sign up with Google first." });
      }

      if (!user) {
        const generatedPassword = crypto.randomBytes(48).toString("base64url");
        const password = await bcrypt.hash(generatedPassword, await bcrypt.genSalt(10));
        user = await User.create({
          name: googleAccount.name?.trim() || email.split("@")[0],
          email,
          password,
          googleId: googleAccount.sub,
          avatar: googleAccount.picture || "",
          appearanceMode: "light",
          organization: { name: googleAccount.name?.trim() || email.split("@")[0], logo: "" },
          role: "organizer",
        });
        created = true;
      } else if (user.role === "organizer") {
        user.googleId = googleAccount.sub;
        if (!user.avatar && googleAccount.picture) user.avatar = googleAccount.picture;
        await user.save();
      }
    }

    if (user.role !== "organizer") {
      return res.status(403).json({ message: "Google sign-in is available for organizer accounts only." });
    }

    const context = requestContext(req);
    await createUserLog(req, {
      userId: user._id,
      userName: user.name || user.email,
      actorId: user._id,
      actorName: user.name || user.email,
      category: created ? "account" : "login",
      action: created ? "account_created" : "logged_in",
      message: created ? "Created account with Google." : `Logged in with Google from ${context.device}.`,
      metadata: { email: user.email, provider: "google" },
    });

    const token = await createSessionToken(user);
    return res.json(userPayload(user, token));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists. Try signing in." });
    }
    console.error("Google sign-in failed:", error);
    return res.status(500).json({ message: "Google sign-in failed. Please try again." });
  }
};

// @desc    Get user profile data
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = req.user || (await User.findById(req.user?.id).select("-password").lean());
    if (user) {
      res.json(userPayload(user));
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      const previous = {
        name: user.name,
        email: user.email,
        avatar: user.avatar || "",
        timezone: user.timezone,
        organization: {
          name: user.organization?.name || user.name || "",
          logo: user.organization?.logo || "",
        },
        appearanceMode: user.appearanceMode,
        gender: user.gender,
        dob: user.dob ? user.dob.toISOString() : null,
        integrations: {
          discordWebhookUrl: user.integrations?.discordWebhookUrl || "",
          twitchChannelUrl: user.integrations?.twitchChannelUrl || "",
        },
      };
      const nextEmail = req.body.email ? String(req.body.email).trim().toLowerCase() : user.email;
      if (!req.body.name || !String(req.body.name).trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      if (!nextEmail || !nextEmail.includes("@")) {
        return res.status(400).json({ message: "Valid email is required" });
      }
      const emailOwner = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
      if (emailOwner) {
        return res.status(409).json({ message: "Email is already in use" });
      }

      user.name = String(req.body.name).trim();
      user.email = nextEmail;
      user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
      if (req.body.dob !== undefined) {
        if (!req.body.dob) {
          user.dob = null;
        } else {
          const parsedDob = new Date(req.body.dob);
          user.dob = isNaN(parsedDob.getTime()) ? null : parsedDob;
        }
      }
      user.gender = req.body.gender !== undefined ? req.body.gender : user.gender;
      if (req.body.organization !== undefined) {
        const organization = parseJsonField(req.body.organization, {});
        const organizationName = String(organization.name || "").trim();
        if (!organizationName) {
          return res.status(400).json({ message: "Organization name is required" });
        }
        user.organization = {
          ...(user.organization?.toObject?.() || user.organization || {}),
          name: organizationName,
        };
        if (organization.logo !== undefined && !String(organization.logo).startsWith("data:")) {
          user.organization.logo = organization.logo || "";
        }
      }
      const avatarFile = req.file || req.files?.avatar?.[0];
      const organizationLogoFile = req.files?.organizationLogo?.[0];
      if (avatarFile) {
        const oldAvatar = user.avatar;
        user.avatar = await uploadProfileLogo(avatarFile);
        await deleteCloudinaryUrl(oldAvatar);
      } else if (req.body.avatar !== undefined && !String(req.body.avatar).startsWith("data:")) {
        user.avatar = req.body.avatar;
      }
      if (organizationLogoFile) {
        const oldOrganizationLogo = user.organization?.logo;
        user.organization = {
          ...(user.organization?.toObject?.() || user.organization || {}),
          logo: await uploadProfileLogo(organizationLogoFile),
        };
        await deleteCloudinaryUrl(oldOrganizationLogo);
      }
      user.timezone = req.body.timezone !== undefined ? req.body.timezone : user.timezone;
      if (req.body.appearanceMode !== undefined) {
        user.appearanceMode = ["system", "light", "dark"].includes(req.body.appearanceMode)
          ? req.body.appearanceMode
          : user.appearanceMode;
      }
      if (req.body.integrations !== undefined) {
        const integrations = parseJsonField(req.body.integrations, {});
        user.integrations = {
          discordWebhookUrl: integrations.discordWebhookUrl || "",
          twitchChannelUrl: integrations.twitchChannelUrl || "",
        };
      }

      const updatedUser = await user.save();
      invalidateUserAuthCache(updatedUser._id);
      const changes = [
        changed("name", "Name", previous.name, updatedUser.name),
        changed("email", "Email", previous.email, updatedUser.email),
        changed(
          "avatar",
          "Profile photo",
          previous.avatar,
          updatedUser.avatar || "",
          "Changed profile photo.",
        ),
        changed("timezone", "Timezone", previous.timezone, updatedUser.timezone),
        changed(
          "organization.name",
          "Organization name",
          previous.organization.name,
          updatedUser.organization?.name || "",
        ),
        changed(
          "organization.logo",
          "Organization logo",
          previous.organization.logo,
          updatedUser.organization?.logo || "",
          "Changed organization logo.",
        ),
        changed(
          "appearanceMode",
          "Appearance mode",
          previous.appearanceMode,
          updatedUser.appearanceMode,
        ),
        changed("gender", "Gender", previous.gender, updatedUser.gender),
        changed(
          "dob",
          "Date of birth",
          previous.dob,
          updatedUser.dob ? updatedUser.dob.toISOString() : null,
        ),
        changed(
          "integrations.discordWebhookUrl",
          "Discord webhook",
          previous.integrations.discordWebhookUrl ? "set" : "empty",
          updatedUser.integrations?.discordWebhookUrl ? "set" : "empty",
        ),
        changed(
          "integrations.twitchChannelUrl",
          "Twitch channel",
          previous.integrations.twitchChannelUrl ? "set" : "empty",
          updatedUser.integrations?.twitchChannelUrl ? "set" : "empty",
        ),
      ].filter(Boolean);

      if (changes.length > 0) {
        await createUserLog(req, {
          userId: updatedUser._id,
          userName: updatedUser.name || updatedUser.email,
          actorId: updatedUser._id,
          actorName: updatedUser.name || updatedUser.email,
          category: "account",
          action: "profile_updated",
          message: "Updated profile details.",
          changes,
        });
      }

      res.json(userPayload(updatedUser));
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("updateUserProfile error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Update user password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (user && (await bcrypt.compare(currentPassword, user.password))) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();
      invalidateUserAuthCache(user._id);
      await createUserLog(req, {
        category: "account",
        action: "password_changed",
        message: "Changed password.",
      });
      res.json({ message: "Password updated successfully" });
    } else {
      res.status(400).json({ message: "Current password is incorrect" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  sendOtp,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  completePasswordReset,
  registerUser,
  loginUser,
  loginAdmin,
  googleLogin,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  updatePassword,
};
