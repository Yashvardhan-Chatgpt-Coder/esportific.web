const ScoringRule = require("../models/ScoringRule");
const Event = require("../models/Event");
const { getOrganizerId, findOwned } = require("../utils/tenant");
const { changed, createUserLog } = require("../utils/userLogs");

function normalizePlacementPoints(input) {
  if (!input) return {};
  if (input instanceof Map) return Object.fromEntries(input);
  return input;
}

function defaultFieldsForFormat(format) {
  const normalized = String(format || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized === "battle_royale" || normalized === "br" || normalized.includes("battle")
    ? ["placementPoints", "killPoints"]
    : ["winPoints", "drawPoints", "lossPoints"];
}

function snapshotRule(rule) {
  return {
    name: rule.name,
    format: rule.format,
    gameId: rule.gameId ? String(rule.gameId) : null,
    gameName: rule.gameName || "",
    isGeneric: rule.isGeneric,
    scoringFields: [...(rule.scoringFields || [])],
    description: rule.description || "",
    killPoints: rule.killPoints,
    winPoints: rule.winPoints,
    drawPoints: rule.drawPoints,
    lossPoints: rule.lossPoints,
    placementPoints: normalizePlacementPoints(rule.placementPoints),
  };
}

function assignScoringRuleFields(rule, body) {
  const {
    name,
    format,
    gameId,
    gameName,
    isGeneric,
    scoringFields,
    description,
    killPoints,
    placementPoints,
    winPoints,
    drawPoints,
    lossPoints,
  } = body;

  if (name !== undefined) rule.name = name;
  if (format !== undefined) rule.format = format;
  if (gameId !== undefined) {
    rule.gameId = gameId || null;
    rule.isGeneric = !gameId;
  }
  if (gameName !== undefined) rule.gameName = rule.gameId ? gameName : "";
  if (isGeneric !== undefined && !rule.gameId) rule.isGeneric = Boolean(isGeneric);
  if (scoringFields !== undefined) {
    rule.scoringFields =
      Array.isArray(scoringFields) && scoringFields.length > 0
        ? scoringFields
        : defaultFieldsForFormat(format || rule.format);
  }
  if (description !== undefined) rule.description = description;
  if (killPoints !== undefined) rule.killPoints = killPoints;
  if (winPoints !== undefined) rule.winPoints = winPoints;
  if (drawPoints !== undefined) rule.drawPoints = drawPoints;
  if (lossPoints !== undefined) rule.lossPoints = lossPoints;
  if (placementPoints !== undefined) {
    rule.placementPoints = normalizePlacementPoints(placementPoints);
  }
}

function changeSet(previous, rule) {
  return [
    changed("scoring.name", "Template name", previous.name, rule.name),
    changed("scoring.format", "Format", previous.format, rule.format),
    changed("scoring.gameId", "Game", previous.gameId, rule.gameId ? String(rule.gameId) : null),
    changed("scoring.gameName", "Game name", previous.gameName, rule.gameName || ""),
    changed("scoring.isGeneric", "Generic status", previous.isGeneric, rule.isGeneric),
    changed(
      "scoring.scoringFields",
      "Scoring fields",
      previous.scoringFields,
      rule.scoringFields || [],
    ),
    changed("scoring.description", "Description", previous.description, rule.description || ""),
    changed("scoring.killPoints", "Kill points", previous.killPoints, rule.killPoints),
    changed("scoring.winPoints", "Win points", previous.winPoints, rule.winPoints),
    changed("scoring.drawPoints", "Draw points", previous.drawPoints, rule.drawPoints),
    changed("scoring.lossPoints", "Loss points", previous.lossPoints, rule.lossPoints),
    changed(
      "scoring.placementPoints",
      "Placement points",
      previous.placementPoints,
      normalizePlacementPoints(rule.placementPoints),
    ),
  ].filter(Boolean);
}

exports.createScoringRule = async (req, res) => {
  try {
    const {
      name,
      format,
      gameId,
      gameName,
      isGeneric,
      scoringFields,
      description,
      killPoints,
      placementPoints,
      winPoints,
      drawPoints,
      lossPoints,
      isTemplate,
    } = req.body;

    const rule = new ScoringRule({
      organizerId: getOrganizerId(req),
      name,
      format: format || "battle_royale",
      gameId: gameId || null,
      gameName: gameId ? gameName || "" : "",
      isGeneric: gameId ? false : isGeneric !== false,
      scoringFields:
        Array.isArray(scoringFields) && scoringFields.length > 0
          ? scoringFields
          : defaultFieldsForFormat(format || "battle_royale"),
      description: description || "",
      killPoints: killPoints ?? 1,
      winPoints: winPoints ?? 0,
      drawPoints: drawPoints ?? 0,
      lossPoints: lossPoints ?? 0,
      isTemplate: isTemplate !== false,
      placementPoints: normalizePlacementPoints(placementPoints),
    });

    await rule.save();
    await createUserLog(req, {
      category: "activity",
      action: "scoring_template_created",
      message: `Created scoring template ${rule.name}.`,
      metadata: {
        scoringRuleId: rule._id,
        format: rule.format,
        gameName: rule.gameName,
      },
    });
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getScoringRules = async (req, res) => {
  try {
    const filter = {
      isTemplate: { $ne: false },
      $or: [{ organizerId: getOrganizerId(req) }, { isPlatform: true }],
    };
    const search = String(req.query.search || '').trim();
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$and = [{ $or: ['name', 'description', 'format', 'gameName'].map((field) => ({
        [field]: { $regex: escapedSearch, $options: 'i' },
      })) }];
    }

    const type = ['platform', 'custom'].includes(req.query.type) ? req.query.type : 'all';
    const paginated = req.query.page !== undefined;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    const typedFilter = (ruleType) => ({
      ...filter,
      ...(ruleType === 'platform' ? { isPlatform: true } : {}),
      ...(ruleType === 'custom' ? { isPlatform: { $ne: true } } : {}),
    });
    const query = ScoringRule.find(typedFilter(type)).sort({
      isPlatform: -1,
      createdAt: -1,
    });
    if (!paginated) return res.json(await query);

    const [total, platformCount, customCount, items] = await Promise.all([
      ScoringRule.countDocuments(typedFilter(type)),
      ScoringRule.countDocuments(typedFilter('platform')),
      ScoringRule.countDocuments(typedFilter('custom')),
      query.skip((page - 1) * limit).limit(limit).lean(),
    ]);
    res.json({ items, total, page, limit, counts: { all: platformCount + customCount, platform: platformCount, custom: customCount } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getScoringRuleById = async (req, res) => {
  try {
    const rule = await findOwned(ScoringRule, req, req.params.id);
    if (!rule) return res.status(404).json({ error: "Rule not found" });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getScoringRuleUsage = async (req, res) => {
  try {
    const rule = await findOwned(ScoringRule, req, req.params.id);
    if (!rule) return res.status(404).json({ error: "Rule not found" });

    const eventCount = await Event.countDocuments({
      organizerId: getOrganizerId(req),
      scoringRuleId: rule._id,
    });

    res.json({ eventCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateScoringRule = async (req, res) => {
  try {
    const rule = await findOwned(ScoringRule, req, req.params.id);
    if (!rule) return res.status(404).json({ error: "Rule not found" });

    const eventCount = await Event.countDocuments({
      organizerId: getOrganizerId(req),
      scoringRuleId: rule._id,
    });
    const applyToEvents = req.body.applyToEvents !== false;
    const previous = snapshotRule(rule);

    if (!applyToEvents && eventCount > 0) {
      const nextRule = new ScoringRule({
        organizerId: rule.organizerId,
        name: rule.name,
        format: rule.format,
        gameId: rule.gameId || null,
        gameName: rule.gameName || "",
        isGeneric: rule.isGeneric,
        scoringFields: [...(rule.scoringFields || [])],
        description: rule.description || "",
        killPoints: rule.killPoints,
        winPoints: rule.winPoints,
        drawPoints: rule.drawPoints,
        lossPoints: rule.lossPoints,
        isTemplate: true,
        isPlatform: false,
        placementPoints: normalizePlacementPoints(rule.placementPoints),
      });

      assignScoringRuleFields(nextRule, req.body);
      await nextRule.save();

      rule.isTemplate = false;
      await rule.save();

      await createUserLog(req, {
        category: "activity",
        action: "scoring_template_updated_future_only",
        message: `Updated scoring template ${nextRule.name} for future events only.`,
        changes: changeSet(previous, nextRule),
        metadata: {
          previousScoringRuleId: rule._id,
          scoringRuleId: nextRule._id,
          existingEventCount: eventCount,
        },
      });

      return res.json(nextRule);
    }

    assignScoringRuleFields(rule, req.body);
    await rule.save();
    const changes = changeSet(previous, rule);

    if (changes.length > 0) {
      await createUserLog(req, {
        category: "activity",
        action: "scoring_template_updated",
        message: `Updated scoring template ${rule.name}.`,
        changes,
        metadata: { scoringRuleId: rule._id },
      });
    }
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteScoringRule = async (req, res) => {
  try {
    const rule = await findOwned(ScoringRule, req, req.params.id);
    if (!rule) return res.status(404).json({ error: "Rule not found" });

    const eventUsingRule = await Event.findOne({
      organizerId: getOrganizerId(req),
      scoringRuleId: rule._id,
    }).select("_id name");

    if (eventUsingRule) {
      return res.status(409).json({
        message: `This scoring rule is used by ${eventUsingRule.name}. Change that event first, then delete the rule.`,
      });
    }

    await rule.deleteOne();
    await createUserLog(req, {
      category: "activity",
      action: "scoring_template_deleted",
      message: `Deleted scoring template ${rule.name}.`,
      metadata: {
        scoringRuleId: rule._id,
        format: rule.format,
        gameName: rule.gameName,
      },
    });
    res.json({ message: "Rule deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
