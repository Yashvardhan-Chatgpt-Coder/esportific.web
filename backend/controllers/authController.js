const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Otp = require("../models/Otp");
const { Resend } = require("resend");
const cloudinary = require("../config/cloudinary");
const { CLOUDINARY_FOLDERS } = require("../utils/cloudinaryFolders");
const { changed, createUserLog, requestContext } = require("../utils/userLogs");

// Instantiate Resend with API Key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

// Generate JWT (expires in 6 months as requested)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "180d",
  });
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

function userPayload(user, includeToken = false) {
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
    appearanceMode: user.appearanceMode || "system",
    integrations: {
      discordWebhookUrl: user.integrations?.discordWebhookUrl || "",
      twitchChannelUrl: user.integrations?.twitchChannelUrl || "",
    },
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  if (includeToken) payload.token = generateToken(user._id);
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
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store/Update OTP document in database with automatic 5-min expiration
    await Otp.findOneAndUpdate(
      { email },
      { code: otp, createdAt: new Date() },
      { upsert: true, new: true },
    );

    // Send email using Resend
    await resend.emails.send({
      from: "Rangrove Esports <onboarding@resend.dev>",
      to: email,
      subject: "Verify your Rangrove Account",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your Email - Rangrove Esports</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafafa; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 460px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          
          <!-- Top bar with brand logo styling -->
          <tr>
            <td style="padding: 32px 32px 16px 32px; border-bottom: 1px solid #f4f4f5; text-align: left;">
              <span style="font-size: 16px; font-weight: 800; letter-spacing: 1.5px; color: #09090b; text-transform: uppercase;">RANGROVE</span>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 10px 0; color: #09090b; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.25;">Verify your email</h2>
              <p style="margin: 0 0 28px 0; color: #52525b; font-size: 14px; line-height: 1.5;">Thank you for registering an organizer account at Rangrove. Enter the 6-digit verification code below to complete your account setup:</p>
              
              <!-- Monochromatic Code Block Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td align="center" style="background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 10px; padding: 20px; text-align: center;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #09090b; line-height: 1; display: inline-block; margin-left: 8px;">${otp}</span>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #71717a; font-size: 13.5px; line-height: 1.5;">This verification code is valid for <strong>5 minutes</strong>. If you did not request this verification, you can safely ignore this email.</p>
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; background-color: #fafafa; border-top: 1px solid #e4e4e7; text-align: left;">
              <p style="margin: 0; font-size: 11.5px; color: #a1a1aa; line-height: 1.5;">&copy; 2026 Rangrove Esports. Built for premium tournament hosts. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    res.status(200).json({ message: "Verification code sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send verification code" });
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

      res.status(201).json(userPayload(user, true));
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
      res.json(userPayload(user, true));
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

    return res.json(userPayload(user, true));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get user profile data
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
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

      res.json(userPayload(updatedUser, true));
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
  registerUser,
  loginUser,
  loginAdmin,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  updatePassword,
};
