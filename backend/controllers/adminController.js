const cloudinary = require("../config/cloudinary");
const Team = require("../models/Team");
const GameCatalog = require("../models/GameCatalog");
const ScoringRule = require("../models/ScoringRule");
const Event = require("../models/Event");
const Match = require("../models/Match");
const User = require("../models/User");
const UserLog = require("../models/UserLog");
const SupportRequest = require("../models/SupportRequest");
const PlatformTemplate = require("../models/PlatformTemplate");
const PlatformTemplateMigration = require("../models/PlatformTemplateMigration");
const { CLOUDINARY_FOLDERS, CLOUDINARY_AUDIT_FOLDERS } = require("../utils/cloudinaryFolders");

const DEFAULT_PLATFORM_TEMPLATES = [
  ["autumn-season-template", "Autumn Season Template", "Leaderboard", "Battle Royale", "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Autumn%20Season%20Template/Design.html"],
  ["general-template-1", "General Template 1", "Leaderboard", "Battle Royale", "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/General%20Template%201/design.html"],
  ["general-template-2", "General Template 2", "Leaderboard", "Battle Royale", "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/General%20Template%202/design.html"],
  ["general-template-3", "General Template 3", "Leaderboard", "Battle Royale", "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/General%20Template%203/design.html"],
  ["free-fire-theme-template", "Free Fire Theme Template", "Leaderboard", "Battle Royale", "/Templates/Leaderboard/Universal/Battle%20Royal/Team%20Results/Premium/Free%20Fire%20Theme%20Template/design.html"],
  ["autumn-top-shooters-template", "Autumn Top Shooters", "Top Shooters", "Battle Royale", "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/Autumn%20Theme%20Template/design.html"],
  ["general-1-top-shooters-template", "General 1 Top Shooters", "Top Shooters", "Battle Royale", "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%201%20Template/design.html"],
  ["general-2-top-shooters-template", "General 2 Top Shooters", "Top Shooters", "Battle Royale", "/Templates/Leaderboard/Universal/Battle%20Royal/Top%20Shooters/General%202%20Template/design.html"],
].map(([templateKey, name, category, format, previewUrl]) => ({
  templateKey,
  name,
  category,
  format,
  previewUrl,
  tags: [],
}));

function normalizeTemplateTags(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 12);
}

function serializePlatformTemplate(template) {
  return {
    id: template.templateKey,
    name: template.name,
    category: template.category,
    format: template.format,
    previewUrl: template.previewUrl,
    tags: template.tags || [],
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

async function ensureDefaultPlatformTemplates() {
  await PlatformTemplate.bulkWrite(
    DEFAULT_PLATFORM_TEMPLATES.map((template) => ({
      updateOne: {
        filter: { templateKey: template.templateKey },
        update: { $setOnInsert: template },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}

const INITIAL_GAMES = [
  {
    name: "Valorant",
    logo: null,
    maps: ["Ascent", "Bind", "Haven", "Split", "Lotus"],
    modes: ["5v5 Standard", "Swiftplay"],
  },
  {
    name: "BGMI",
    logo: null,
    maps: ["Erangel", "Miramar", "Sanhok", "Vikendi"],
    modes: ["Classic BR", "TDM"],
  },
  {
    name: "Apex Legends",
    logo: null,
    maps: ["World's Edge", "Storm Point", "Broken Moon"],
    modes: ["Battle Royale", "Arenas"],
  },
  {
    name: "Counter-Strike 2",
    logo: null,
    maps: ["Mirage", "Inferno", "Nuke", "Ancient"],
    modes: ["Competitive", "Casual"],
  },
  {
    name: "Rocket League",
    logo: null,
    maps: ["DFH Stadium", "Mannfield", "Champions Field"],
    modes: ["2v2", "3v3"],
  },
  {
    name: "Free Fire",
    logo: null,
    maps: ["Bermuda", "Purgatory", "Kalahari"],
    modes: ["Classic", "Clash Squad"],
  },
  {
    name: "COD Mobile",
    logo: null,
    maps: ["Standoff", "Crash", "Raid"],
    modes: ["MP", "Battle Royale"],
  },
  {
    name: "Fortnite",
    logo: null,
    maps: ["Battle Royale Island"],
    modes: ["Solo", "Duos", "Squads"],
  },
];

const FIELD_SETS = {
  battle_royale: ["placementPoints", "killPoints"],
  elimination: ["winPoints", "drawPoints", "lossPoints"],
};

function slugifyFormat(value) {
  return (
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "custom_format"
  );
}

function inferFormatKey(name) {
  const normalized = String(name || "").toLowerCase();
  if (
    normalized.includes("battle") ||
    normalized.includes("classic") ||
    normalized.includes("br")
  ) {
    return "battle_royale";
  }
  if (
    normalized.includes("tdm") ||
    normalized.includes("clash") ||
    normalized.includes("elimination") ||
    normalized.includes("5v5") ||
    normalized.includes("competitive")
  ) {
    return "elimination";
  }
  return slugifyFormat(name);
}

function defaultFieldsForFormat(key) {
  const normalized = String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (normalized === "battle_royale" || normalized === "br" || normalized.includes("battle")) {
    return FIELD_SETS.battle_royale;
  }
  return FIELD_SETS[normalized] || FIELD_SETS.elimination;
}

function normalizeFormats(formats, modes = []) {
  if (Array.isArray(formats) && formats.length > 0) {
    return formats
      .map((format) => {
        const name = String(format.name || "").trim();
        const key = String(format.key || inferFormatKey(name)).trim();
        return {
          name,
          key,
          scoringFields:
            Array.isArray(format.scoringFields) && format.scoringFields.length > 0
              ? format.scoringFields
              : defaultFieldsForFormat(key),
        };
      })
      .filter((format) => format.name && format.key);
  }

  return modes.map((mode) => {
    const key = inferFormatKey(mode);
    return { name: mode, key, scoringFields: defaultFieldsForFormat(key) };
  });
}

function parseJsonField(value, fallback) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

async function uploadGameLogo(file) {
  if (!file) return null;
  const b64 = Buffer.from(file.buffer).toString("base64");
  const dataURI = `data:${file.mimetype};base64,${b64}`;
  const result = await cloudinary.uploader.upload(dataURI, {
    folder: CLOUDINARY_FOLDERS.GAME_LOGOS,
    format: "webp",
    quality: "auto:good",
    transformation: [{ width: 512, height: 512, crop: "limit" }],
  });
  return result.secure_url;
}

async function ensureInitialGames() {
  const queries = INITIAL_GAMES.map((game) => ({
    name: { $regex: `^${game.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  }));
  const existingGames = await GameCatalog.find({ $or: queries })
    .select("name formats modes")
    .lean();
  const existingByName = new Map(existingGames.map((game) => [game.name.toLowerCase(), game]));
  const operations = INITIAL_GAMES.map((game) => {
    const existing = existingByName.get(game.name.toLowerCase());
    const filter = {
      name: { $regex: `^${game.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    };
    if (!existing) {
      return {
        updateOne: {
          filter,
          update: { $setOnInsert: { ...game, formats: normalizeFormats([], game.modes) } },
          upsert: true,
        },
      };
    }
    if (!Array.isArray(existing.formats) || existing.formats.length === 0) {
      return {
        updateOne: {
          filter: { _id: existing._id },
          update: { $set: { formats: normalizeFormats([], existing.modes || game.modes) } },
        },
      };
    }
    return null;
  }).filter(Boolean);

  if (operations.length > 0) await GameCatalog.bulkWrite(operations, { ordered: false });
}

function gamePayload(body) {
  const rawModes = parseJsonField(body.modes, body.modes);
  const rawMaps = parseJsonField(body.maps, body.maps);
  const rawFormats = parseJsonField(body.formats, body.formats);
  const modes = Array.isArray(rawModes)
    ? rawModes.map((m) => String(m).trim()).filter(Boolean)
    : [];
  return {
    name: String(body.name || "").trim(),
    logo: body.logo || null,
    logoLight: body.logoLightUrl || body.logoLight || body.logo || null,
    logoDark: body.logoDarkUrl || body.logoDark || body.logo || null,
    maps: Array.isArray(rawMaps) ? rawMaps.map((m) => String(m).trim()).filter(Boolean) : [],
    modes,
    formats: normalizeFormats(rawFormats, modes),
  };
}

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSupportRequests = async (req, res) => {
  try {
    const requests = await SupportRequest.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSupportRequest = async (req, res) => {
  try {
    const status = String(req.body.status || "").trim();
    if (!["New", "In review", "Resolved"].includes(status)) {
      return res.status(400).json({ message: "Invalid support request status." });
    }

    const request = await SupportRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    ).populate("userId", "name email");

    if (!request) return res.status(404).json({ message: "Support request not found" });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      role: { $ne: "admin" },
    }).select("-password");

    if (!user) return res.status(404).json({ error: "User not found" });

    const [eventsCount, teamsCount] = await Promise.all([
      Event.countDocuments({ organizerId: user._id }),
      Team.countDocuments({
        organizerId: user._id,
        isPoolTeam: { $ne: false },
        source: { $ne: "event" },
      }),
    ]);

    res.json({
      ...user.toObject(),
      stats: {
        eventsCount,
        teamsCount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserEvents = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      role: { $ne: "admin" },
    }).select("_id");

    if (!user) return res.status(404).json({ error: "User not found" });

    const events = await Event.find({ organizerId: user._id })
      .populate("gameId")
      .populate("scoringRuleId")
      .sort({ createdAt: -1 });

    const eventIds = events.map((event) => event._id);
    const matchCounts = await Match.aggregate([
      { $match: { organizerId: user._id, eventId: { $in: eventIds } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(matchCounts.map((row) => [row._id.toString(), row.count]));

    res.json(
      events.map((event) => ({
        ...event.toObject(),
        matchCount: countMap.get(event._id.toString()) || 0,
      })),
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserTeams = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      role: { $ne: "admin" },
    }).select("_id");

    if (!user) return res.status(404).json({ error: "User not found" });

    const teams = await Team.find({
      organizerId: user._id,
      isPoolTeam: { $ne: false },
      source: { $ne: "event" },
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserScoringRules = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      role: { $ne: "admin" },
    }).select("_id");

    if (!user) return res.status(404).json({ error: "User not found" });

    const rules = await ScoringRule.find({
      organizerId: user._id,
      isPlatform: { $ne: true },
    })
      .populate("gameId")
      .sort({ createdAt: -1 })
      .lean();

    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserLogs = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      role: { $ne: "admin" },
    }).select("_id");

    if (!user) return res.status(404).json({ error: "User not found" });

    const category = req.query.type || req.query.category;
    const validCategories = ["login", "activity", "account"];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid log type" });
    }

    const filter = { userId: user._id };
    if (category) filter.category = category;
    if (category === "login") {
      filter.action = { $in: ["logged_in", "logged_out"] };
      filter["metadata.source"] = { $ne: "seed" };
    }

    const logs = await UserLog.find(filter).sort({ createdAt: -1 }).limit(300).lean();

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

function normalizePlacementPoints(input) {
  if (!input) return {};
  if (input instanceof Map) return Object.fromEntries(input);
  return input;
}

function scoringPayload(body) {
  const gameId = body.gameId || null;
  return {
    name: String(body.name || "").trim(),
    format: body.format || "battle_royale",
    gameId,
    gameName: gameId ? String(body.gameName || "").trim() : "",
    isGeneric: !gameId,
    scoringFields:
      Array.isArray(body.scoringFields) && body.scoringFields.length > 0
        ? body.scoringFields
        : defaultFieldsForFormat(body.format || "battle_royale"),
    description: body.description || "",
    killPoints: body.killPoints ?? 1,
    winPoints: body.winPoints ?? 0,
    drawPoints: body.drawPoints ?? 0,
    lossPoints: body.lossPoints ?? 0,
    placementPoints: normalizePlacementPoints(body.placementPoints),
    isTemplate: true,
    isPlatform: true,
    organizerId: null,
  };
}

// Helper to extract Cloudinary public ID from its secure URL
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

async function deleteCloudinaryUrls(urls) {
  const publicIds = [...new Set(urls.map(extractPublicId).filter(Boolean))];
  await Promise.all(
    publicIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId).catch((err) => {
        console.error("Failed to delete Cloudinary asset:", publicId, err);
      }),
    ),
  );
}

exports.getOrphanedAssets = async (req, res) => {
  try {
    // 1. Get all active images from database
    const [activeTeams, activeGames, activeUsers] = await Promise.all([
      Team.find({}, "logoUrl"),
      GameCatalog.find({}, "logo logoLight logoDark"),
      User.find({}, "avatar"),
    ]);
    const activeUrls = new Set([
      ...activeTeams.map((t) => t.logoUrl).filter(Boolean),
      ...activeGames.flatMap((g) => [g.logo, g.logoLight, g.logoDark]).filter(Boolean),
      ...activeUsers.map((u) => u.avatar).filter(Boolean),
    ]);
    const activePublicIds = new Set();

    for (const url of activeUrls) {
      const publicId = extractPublicId(url);
      if (publicId) {
        activePublicIds.add(publicId);
      }
    }

    // 2. Fetch uploaded images from the approved app folders, plus old folders for cleanup
    let cloudinaryAssets = [];
    for (const folder of CLOUDINARY_AUDIT_FOLDERS) {
      let nextCursor = null;
      do {
        const response = await cloudinary.api.resources({
          type: "upload",
          prefix: `${folder}/`,
          max_results: 500,
          next_cursor: nextCursor,
        });

        if (response && response.resources) {
          cloudinaryAssets = cloudinaryAssets.concat(response.resources);
        }
        nextCursor = response.next_cursor;
      } while (nextCursor);
    }

    // 3. Find assets that are not associated with any active team
    const orphaned = cloudinaryAssets
      .filter((asset) => {
        // Check both URL match and public ID match to be robust
        return !activeUrls.has(asset.secure_url) && !activePublicIds.has(asset.public_id);
      })
      .map((asset) => ({
        publicId: asset.public_id,
        url: asset.secure_url,
        format: asset.format,
        bytes: asset.bytes,
        createdAt: asset.created_at,
        folder: asset.public_id.split("/").slice(0, -1).join("/"),
      }));

    res.json(orphaned);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteOrphanedAssets = async (req, res) => {
  try {
    const { publicIds } = req.body; // Array of public IDs to delete

    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return res.status(400).json({ error: "Missing or invalid publicIds array" });
    }

    // Cloudinary batch delete (caps at 100 per call, we can chunk if needed, but usually is small)
    const result = await cloudinary.api.delete_resources(publicIds);

    res.json({
      message: "Orphaned assets deleted successfully",
      result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getGames = async (req, res) => {
  try {
    await ensureInitialGames();
    const games = await GameCatalog.find().sort({ name: 1 });
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createGame = async (req, res) => {
  try {
    const payload = gamePayload(req.body);
    if (!payload.name) return res.status(400).json({ message: "Game name is required" });
    const uploadedLight = await uploadGameLogo(req.files?.logoLight?.[0]);
    const uploadedDark = await uploadGameLogo(req.files?.logoDark?.[0]);
    if (uploadedLight) payload.logoLight = uploadedLight;
    if (uploadedDark) payload.logoDark = uploadedDark;
    payload.logoLight = payload.logoLight || payload.logoDark || payload.logo || null;
    payload.logoDark = payload.logoDark || payload.logoLight || payload.logo || null;
    payload.logo = payload.logoLight || payload.logoDark || payload.logo || null;
    const game = await GameCatalog.create(payload);
    res.status(201).json(game);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Game name already exists" });
    res.status(500).json({ error: error.message });
  }
};

exports.updateGame = async (req, res) => {
  try {
    const previousGame = await GameCatalog.findById(req.params.id);
    if (!previousGame) return res.status(404).json({ message: "Game not found" });
    const payload = gamePayload(req.body);
    if (!payload.name) return res.status(400).json({ message: "Game name is required" });
    const uploadedLight = await uploadGameLogo(req.files?.logoLight?.[0]);
    const uploadedDark = await uploadGameLogo(req.files?.logoDark?.[0]);
    if (uploadedLight) payload.logoLight = uploadedLight;
    if (uploadedDark) payload.logoDark = uploadedDark;
    payload.logoLight = payload.logoLight || payload.logoDark || payload.logo || null;
    payload.logoDark = payload.logoDark || payload.logoLight || payload.logo || null;
    payload.logo = payload.logoLight || payload.logoDark || payload.logo || null;
    const game = await GameCatalog.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (uploadedLight || uploadedDark) {
      const nextUrls = new Set([game.logo, game.logoLight, game.logoDark].filter(Boolean));
      const replacedUrls = [previousGame.logo, previousGame.logoLight, previousGame.logoDark]
        .filter(Boolean)
        .filter((url) => !nextUrls.has(url));
      await deleteCloudinaryUrls(replacedUrls);
    }
    res.json(game);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Game name already exists" });
    res.status(500).json({ error: error.message });
  }
};

exports.deleteGame = async (req, res) => {
  try {
    const [eventUsageCount, scoringUsageCount] = await Promise.all([
      Event.countDocuments({ gameId: req.params.id }),
      ScoringRule.countDocuments({ gameId: req.params.id }),
    ]);
    if (eventUsageCount > 0 || scoringUsageCount > 0) {
      return res.status(409).json({
        message: "This game is used by existing events or scoring rules and cannot be deleted.",
      });
    }

    const game = await GameCatalog.findByIdAndDelete(req.params.id);
    if (!game) return res.status(404).json({ message: "Game not found" });
    await deleteCloudinaryUrls([game.logo, game.logoLight, game.logoDark].filter(Boolean));
    res.json({ message: "Game deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPlatformScoringRules = async (req, res) => {
  try {
    const rules = await ScoringRule.find({
      isPlatform: true,
      isTemplate: { $ne: false },
    }).sort({ createdAt: -1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createPlatformScoringRule = async (req, res) => {
  try {
    const payload = scoringPayload(req.body);
    if (!payload.name) return res.status(400).json({ message: "Template name is required" });
    const rule = await ScoringRule.create(payload);
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePlatformScoringRule = async (req, res) => {
  try {
    const payload = scoringPayload(req.body);
    if (!payload.name) return res.status(400).json({ message: "Template name is required" });
    const rule = await ScoringRule.findOneAndUpdate(
      { _id: req.params.id, isPlatform: true },
      payload,
      { new: true, runValidators: true },
    );
    if (!rule) return res.status(404).json({ message: "Template not found" });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deletePlatformScoringRule = async (req, res) => {
  try {
    const eventUsingRule = await Event.findOne({ scoringRuleId: req.params.id }).select("_id name");
    if (eventUsingRule) {
      return res.status(409).json({
        message: `This template is used by ${eventUsingRule.name}. Change that event first, then delete it.`,
      });
    }

    const rule = await ScoringRule.findOneAndDelete({ _id: req.params.id, isPlatform: true });
    if (!rule) return res.status(404).json({ message: "Template not found" });
    res.json({ message: "Template deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPlatformTemplates = async (_req, res) => {
  try {
    await ensureDefaultPlatformTemplates();
    const templates = await PlatformTemplate.find().sort({ createdAt: -1 });
    res.json(templates.map(serializePlatformTemplate));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createPlatformTemplate = async (req, res) => {
  try {
    const { name, category, format, previewUrl } = req.body;
    if (!String(name || "").trim()) return res.status(400).json({ message: "Template name is required" });
    if (!String(category || "").trim()) return res.status(400).json({ message: "Template category is required" });
    if (!String(format || "").trim()) return res.status(400).json({ message: "Template format is required" });
    if (!String(previewUrl || "").trim()) return res.status(400).json({ message: "Preview URL is required" });

    const templateKey = `template-${new Date().getTime()}-${Math.random().toString(36).slice(2, 7)}`;
    const template = await PlatformTemplate.create({
      templateKey,
      name: String(name).trim(),
      category: String(category).trim(),
      format: String(format).trim(),
      previewUrl: String(previewUrl).trim(),
      tags: normalizeTemplateTags(req.body.tags),
    });
    res.status(201).json(serializePlatformTemplate(template));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePlatformTemplate = async (req, res) => {
  try {
    const patch = {};
    ["name", "category", "format", "previewUrl"].forEach((field) => {
      if (req.body[field] !== undefined) patch[field] = String(req.body[field]).trim();
    });
    if (req.body.tags !== undefined) patch.tags = normalizeTemplateTags(req.body.tags);
    if (patch.name === "") return res.status(400).json({ message: "Template name is required" });

    const template = await PlatformTemplate.findOneAndUpdate(
      { templateKey: req.params.id },
      patch,
      { new: true, runValidators: true },
    );
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json(serializePlatformTemplate(template));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deletePlatformTemplate = async (req, res) => {
  try {
    const template = await PlatformTemplate.findOneAndDelete({ templateKey: req.params.id });
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json({ message: "Template deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
