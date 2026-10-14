const Event = require("../models/Event");
const mongoose = require("mongoose");
const Match = require("../models/Match");
const MatchResult = require("../models/MatchResult");
const Team = require("../models/Team");
const ScoringRule = require("../models/ScoringRule");
const GameCatalog = require("../models/GameCatalog");
const AuditLog = require("../models/AuditLog");
const cloudinary = require("../config/cloudinary");
const { getOrganizerId, findOwned } = require("../utils/tenant");
const { CLOUDINARY_FOLDERS } = require("../utils/cloudinaryFolders");
const { createUserLog } = require("../utils/userLogs");

async function validateEventRefs(req, teams = [], scoringRuleId = null, gameId = null) {
  const organizerId = getOrganizerId(req);

  if (gameId) {
    const game = await GameCatalog.findById(gameId);
    if (!game) return "Selected game was not found";
  }

  if (scoringRuleId) {
    const rule = await ScoringRule.findOne({
      _id: scoringRuleId,
      $or: [{ organizerId }, { isPlatform: true }],
    });
    if (!rule) return "Selected scoring rule was not found";
  }

  if (Array.isArray(teams) && teams.length > 0) {
    const uniqueTeamIds = [...new Set(teams.map(String))];
    if (uniqueTeamIds.length !== teams.length) return "The same team cannot be added twice";

    const count = await Team.countDocuments({
      _id: { $in: uniqueTeamIds },
      organizerId,
    });
    if (count !== uniqueTeamIds.length) return "One or more selected teams were not found";
  }

  return null;
}

async function findGameByIdOrName(gameId, gameName) {
  if (gameId) return GameCatalog.findById(gameId);
  const name = String(gameName || "").trim();
  if (!name) return null;
  return GameCatalog.findOne({ name });
}

async function backfillEventGameLinks(events) {
  const list = Array.isArray(events) ? events : [events].filter(Boolean);
  const missing = list.filter((event) => !event.gameId && event.game);
  if (missing.length === 0) return false;

  const names = [...new Set(missing.map((event) => event.game).filter(Boolean))];
  const games = await GameCatalog.find({ name: { $in: names } });
  const gameByName = new Map(games.map((game) => [game.name, game]));
  const updates = [];

  for (const event of missing) {
    const game = gameByName.get(event.game);
    if (!game) continue;
    event.gameId = game._id;
    updates.push({
      updateOne: {
        filter: { _id: event._id, gameId: null },
        update: { $set: { gameId: game._id } },
      },
    });
  }

  if (updates.length === 0) return false;
  await Event.bulkWrite(updates);
  return true;
}

function placementArrayToMap(points = []) {
  const map = {};
  points.forEach((pts, index) => {
    if (Number(pts) > 0) map[String(index + 1)] = Number(pts);
  });
  return map;
}

function playersFromNames(names = []) {
  return names
    .map((name) => String(name || "").trim())
    .filter(Boolean)
    .map((name, index) => ({
      playerId: `p${index + 1}`,
      name,
      inGameId: "",
    }));
}

async function nextAutoEventName(organizerId, session = null) {
  const query = Event.find({ organizerId, name: /^Match \d+$/i })
    .select("name")
    .lean();
  if (session) query.session(session);
  const events = await query;
  const highest = events.reduce((max, event) => {
    const match = String(event.name || "").match(/^Match\s+(\d+)$/i);
    return match ? Math.max(max, Number(match[1]) || 0) : max;
  }, 0);
  return `Match ${highest + 1}`;
}

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
  return lastDot !== -1 ? path.substring(0, lastDot) : path;
}

async function uploadTeamLogo(dataUrl, uploadedUrls) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return "";
  const result = await cloudinary.uploader.upload(dataUrl, {
    folder: CLOUDINARY_FOLDERS.TEAM_LOGOS,
    format: "webp",
    quality: "auto:eco",
    transformation: [{ width: 256, height: 256, crop: "limit" }],
  });
  uploadedUrls.push(result.secure_url);
  return result.secure_url;
}

async function cleanupUploadedUrls(urls) {
  await Promise.all(
    urls
      .map(extractPublicId)
      .filter(Boolean)
      .map((publicId) => cloudinary.uploader.destroy(publicId).catch(() => null)),
  );
}

exports.createEvent = async (req, res) => {
  try {
    const { name, game, gameId, format, startDate, endDate, status, scoringRuleId, teams } =
      req.body;
    const organizerId = getOrganizerId(req);
    const eventName = String(name || "").trim() || (await nextAutoEventName(organizerId));

    const refError = await validateEventRefs(
      req,
      teams || [],
      scoringRuleId || null,
      gameId || null,
    );
    if (refError) return res.status(400).json({ message: refError });
    const selectedGame = await findGameByIdOrName(gameId, game);

    const event = new Event({
      organizerId,
      name: eventName,
      gameId: selectedGame?._id || null,
      game: selectedGame?.name || game || "",
      format: format || "",
      startDate: startDate || null,
      endDate: endDate || null,
      status: status || "Draft",
      scoringRuleId: scoringRuleId || null,
      teams: teams || [],
    });

    await event.save();
    const populated = await Event.findById(event._id)
      .populate("gameId")
      .populate("scoringRuleId")
      .populate("teams");
    await createUserLog(req, {
      category: "activity",
      action: "event_created",
      message: `Created event ${event.name}.`,
      metadata: {
        eventId: event._id,
        game: event.game,
        format: event.format,
        teamCount: event.teams.length,
      },
    });
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createEventWithSetup = async (req, res) => {
  const session = await mongoose.startSession();
  const uploadedLogoUrls = [];

  try {
    const { event: eventInput = {}, scoringRule: scoringInput = {}, teams = [] } = req.body;
    const organizerId = getOrganizerId(req);
    const inputName = String(eventInput.name || "").trim();

    const selectedGame = await findGameByIdOrName(eventInput.gameId, eventInput.game);
    const refError = await validateEventRefs(req, [], null, eventInput.gameId || null);
    if (refError) return res.status(400).json({ message: refError });

    let createdEventId = null;
    await session.withTransaction(async () => {
      const name = inputName || (await nextAutoEventName(organizerId, session));
      const event = new Event({
        _id: new mongoose.Types.ObjectId(),
        organizerId,
        name,
        gameId: selectedGame?._id || null,
        game: selectedGame?.name || eventInput.game || "",
        format: eventInput.format || "",
        startDate: eventInput.startDate || null,
        endDate: eventInput.endDate || null,
        status: eventInput.status || "Draft",
        teams: [],
      });

      const scoringRule = new ScoringRule({
        organizerId,
        name: String(scoringInput.name || "").trim() || `${name} Scoring`,
        format: scoringInput.format || eventInput.format || "battle_royale",
        gameId: selectedGame?._id || null,
        gameName: selectedGame?.name || scoringInput.gameName || event.game || "",
        isGeneric: !selectedGame,
        scoringFields: scoringInput.scoringFields || [],
        description: scoringInput.description || "Created with event wizard",
        killPoints: Number(scoringInput.killPoints ?? 1),
        winPoints: Number(scoringInput.winPoints ?? 0),
        drawPoints: Number(scoringInput.drawPoints ?? 0),
        lossPoints: Number(scoringInput.lossPoints ?? 0),
        isTemplate: false,
        placementPoints:
          scoringInput.placementPoints ||
          placementArrayToMap(scoringInput.placementPointList || []),
      });
      await scoringRule.save({ session });
      event.scoringRuleId = scoringRule._id;

      const teamInputs = Array.isArray(teams) ? teams : [];
      const existingIds = teamInputs
        .map((team) => team.id)
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id));
      const existingTeams = existingIds.length > 0
        ? await Team.find({ _id: { $in: existingIds }, organizerId }).select("_id").session(session).lean()
        : [];
      const existingTeamIds = new Set(existingTeams.map((team) => team._id.toString()));
      const teamIds = new Array(teamInputs.length);
      const newTeamEntries = [];

      teamInputs.forEach((teamInput, index) => {
        if (teamInput.id && mongoose.Types.ObjectId.isValid(teamInput.id)) {
          if (!existingTeamIds.has(String(teamInput.id))) {
            throw new Error("One or more selected teams were not found");
          }
          teamIds[index] = new mongoose.Types.ObjectId(teamInput.id);
          return;
        }

        const teamName = String(teamInput.name || "").trim();
        if (!teamName) throw new Error("Every new team needs a name");
        newTeamEntries.push({ teamInput, index });
      });

      const newTeamDocuments = [];
      for (const { teamInput } of newTeamEntries) {
        const logoUrl = await uploadTeamLogo(teamInput.logo, uploadedLogoUrls);
        newTeamDocuments.push({
          organizerId,
          name: String(teamInput.name).trim(),
          tags: Array.isArray(teamInput.tags) ? teamInput.tags : [],
          contactMobile: teamInput.contactMobile ? String(teamInput.contactMobile).trim() : "",
          players: playersFromNames(teamInput.players || []),
          logoUrl,
          isPoolTeam: Boolean(teamInput.addToDatabase),
          source: "event",
          sourceEventId: event._id,
          sourceEventName: event.name,
        });
      }
      if (newTeamDocuments.length > 0) {
        const createdTeams = await Team.insertMany(newTeamDocuments, { session, ordered: true });
        newTeamEntries.forEach(({ index }, createdIndex) => {
          teamIds[index] = createdTeams[createdIndex]._id;
        });
      }

      event.teams = teamIds;
      await event.save({ session });
      createdEventId = event._id;
    });

    const populated = await Event.findById(createdEventId)
      .populate("gameId")
      .populate("scoringRuleId")
      .populate("teams");
    await createUserLog(req, {
      category: "activity",
      action: "event_created",
      message: `Created event ${populated.name}.`,
      metadata: {
        eventId: populated._id,
        game: populated.game,
        format: populated.format,
        teamCount: populated.teams.length,
        createdWithSetup: true,
      },
    });

    res.status(201).json(populated);
  } catch (error) {
    await cleanupUploadedUrls(uploadedLogoUrls);
    const transactionUnsupported = error?.message?.includes("Transaction numbers are only allowed");
    res.status(transactionUnsupported ? 409 : 500).json({
      message: transactionUnsupported
        ? "Atomic event creation requires MongoDB transactions. Please run MongoDB as a replica set."
        : error.message,
    });
  } finally {
    await session.endSession();
  }
};

exports.getEvents = async (req, res) => {
  try {
    const paginated = req.query.page !== undefined;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const search = String(req.query.search || "").trim();
    const filter = { organizerId: getOrganizerId(req) };
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = ["name", "game", "format"].map((field) => ({
        [field]: { $regex: escapedSearch, $options: "i" },
      }));
    }
    const buildEventQuery = () => {
      const query = Event.find(filter)
        .populate("gameId")
        .populate("scoringRuleId")
        .sort({ createdAt: -1 });
      return paginated ? query.skip((page - 1) * limit).limit(limit) : query;
    };

    const [eventCount, initialEvents] = await Promise.all([
      paginated ? Event.countDocuments(filter) : Promise.resolve(null),
      buildEventQuery(),
    ]);
    let events = initialEvents;
    if (await backfillEventGameLinks(events)) {
      events = await buildEventQuery();
    }

    const eventIds = events.map((e) => e._id);
    const matchCounts = await Match.aggregate([
      { $match: { eventId: { $in: eventIds }, organizerId: getOrganizerId(req) } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(matchCounts.map((m) => [m._id.toString(), m.count]));

    const payload = events.map((event) => {
      const obj = event.toObject();
      obj.matchCount = countMap.get(event._id.toString()) || 0;
      return obj;
    });

    res.json(paginated ? { items: payload, total: eventCount, page, limit } : payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const filter =
      req.user?.role === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, organizerId: getOrganizerId(req) };
    let event = await Event.findOne(filter)
      .populate("organizerId", "name email")
      .populate("gameId")
      .populate("scoringRuleId")
      .populate("teams");

    if (!event) return res.status(404).json({ error: "Event not found" });
    if (await backfillEventGameLinks(event)) {
      event = await Event.findOne(filter)
        .populate("organizerId", "name email")
        .populate("gameId")
        .populate("scoringRuleId")
        .populate("teams");
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await findOwned(Event, req, req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const { name, game, gameId, format, startDate, endDate, status, scoringRuleId, teams } =
      req.body;
    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ message: "Event name is required" });
    }

    const refError = await validateEventRefs(
      req,
      teams !== undefined ? teams : [],
      scoringRuleId !== undefined ? scoringRuleId : null,
      gameId !== undefined ? gameId : null,
    );
    if (refError) return res.status(400).json({ message: refError });

    const selectedGame =
      gameId !== undefined
        ? await findGameByIdOrName(gameId, game)
        : game !== undefined
          ? await findGameByIdOrName(null, game)
          : null;
    if (name !== undefined) event.name = String(name).trim();
    if (gameId !== undefined || game !== undefined)
      event.gameId = selectedGame?._id || gameId || null;
    if (game !== undefined || gameId !== undefined) event.game = selectedGame?.name || game || "";
    if (format !== undefined) event.format = format;
    if (startDate !== undefined) event.startDate = startDate;
    if (endDate !== undefined) event.endDate = endDate;
    if (status !== undefined) event.status = status;
    if (scoringRuleId !== undefined) event.scoringRuleId = scoringRuleId;
    if (teams !== undefined) event.teams = teams;

    await event.save();
    const populated = await Event.findById(event._id)
      .populate("gameId")
      .populate("scoringRuleId")
      .populate("teams");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await findOwned(Event, req, req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const matches = await Match.find({ eventId: event._id });
    const matchIds = matches.map((m) => m._id);
    await MatchResult.deleteMany({ matchId: { $in: matchIds }, organizerId: getOrganizerId(req) });
    await Match.deleteMany({ eventId: event._id, organizerId: getOrganizerId(req) });
    await Team.deleteMany({
      organizerId: getOrganizerId(req),
      $or: [
        { _id: { $in: event.teams || [] }, isPoolTeam: false },
        { isPoolTeam: false, source: "event", sourceEventId: event._id },
      ],
    });
    await event.deleteOne();
    await AuditLog.create({
      organizerId: getOrganizerId(req),
      eventId: event._id,
      userId: req.user._id,
      userName: req.user.name || req.user.email || "Unknown user",
      category: "event",
      action: "event_deleted",
      message: `Deleted event ${event.name}.`,
      metadata: { eventId: event._id },
    });
    await createUserLog(req, {
      category: "activity",
      action: "event_deleted",
      message: `Deleted event ${event.name}.`,
      metadata: { eventId: event._id },
    });

    res.json({ message: "Event deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
