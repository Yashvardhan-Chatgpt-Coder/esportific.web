const Match = require('../models/Match');
const MatchResult = require('../models/MatchResult');
const Event = require('../models/Event');
const Team = require('../models/Team');
const {
  getOrganizerId,
  findOwnedEvent,
  findOwnedMatch,
} = require('../utils/tenant');

async function findReadableEvent(req, eventId) {
  if (req.user?.role === 'admin') return Event.findById(eventId);
  return findOwnedEvent(req, eventId);
}

async function findReadableMatch(req, matchId) {
  if (req.user?.role === 'admin') return Match.findById(matchId);
  return findOwnedMatch(req, matchId);
}

function ownerIdFor(req, doc) {
  return req.user?.role === 'admin' && doc?.organizerId ? doc.organizerId : getOrganizerId(req);
}

exports.createMatch = async (req, res) => {
  try {
    const { eventId, name, map, order } = req.body;
    const event = await findOwnedEvent(req, eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const match = new Match({
      organizerId: getOrganizerId(req),
      eventId,
      name,
      map: map || '',
      order: order ?? 0,
    });

    await match.save();
    res.status(201).json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMatchesByEvent = async (req, res) => {
  try {
    const event = await findReadableEvent(req, req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const organizerId = ownerIdFor(req, event);

    const matches = await Match.find({
      eventId: req.params.eventId,
      organizerId,
    }).sort({ order: 1, createdAt: 1 }).lean();

    if (matches.length === 0) return res.json([]);

    const matchIds = matches.map((match) => match._id);
    const results = await MatchResult.find({
      matchId: { $in: matchIds },
      organizerId,
    }).populate('teamId');
    const resultsByMatch = new Map();
    for (const result of results) {
      const key = result.matchId.toString();
      const group = resultsByMatch.get(key) || [];
      group.push(result);
      resultsByMatch.set(key, group);
    }

    res.json(matches.map((match) => ({
      ...match,
      results: resultsByMatch.get(match._id.toString()) || [],
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateMatch = async (req, res) => {
  try {
    const match = await findOwnedMatch(req, req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const { name, map, status, order } = req.body;
    if (name !== undefined) match.name = name;
    if (map !== undefined) match.map = map;
    if (status !== undefined) match.status = status;
    if (order !== undefined) match.order = order;

    await match.save();
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteMatch = async (req, res) => {
  try {
    const match = await findOwnedMatch(req, req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    await MatchResult.deleteMany({ matchId: match._id });
    await match.deleteOne();
    res.json({ message: 'Match and results deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.saveMatchResults = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { results } = req.body;

    const match = await findOwnedMatch(req, matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    if (!Array.isArray(results)) {
      return res.status(400).json({ message: 'Results must be an array' });
    }

    let scoringRule = null;
    const event = await Event.findOne({
      _id: match.eventId,
      organizerId: getOrganizerId(req),
    }).populate('scoringRuleId');
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (event?.scoringRuleId) {
      scoringRule = event.scoringRuleId;
    }

    const eventTeamIds = (event.teams || []).map((id) => id.toString());
    const usedTeams = new Set();
    const usedPlacements = new Set();

    for (const result of results) {
      const teamId = String(result.teamId || '');
      const placement = Number(result.placement);
      const kills = Number(result.kills ?? 0);

      if (!teamId || !eventTeamIds.includes(teamId)) {
        return res.status(400).json({ message: 'Every result team must belong to this event' });
      }
      if (usedTeams.has(teamId)) {
        return res.status(400).json({ message: 'A team can only appear once per match' });
      }
      if (!Number.isInteger(placement) || placement < 1) {
        return res.status(400).json({ message: 'Every result needs a valid placement' });
      }
      if (usedPlacements.has(placement)) {
        return res.status(400).json({ message: 'Two teams cannot have the same placement' });
      }
      if (!Number.isFinite(kills) || kills < 0) {
        return res.status(400).json({ message: 'Kills cannot be negative' });
      }

      const playerKills = result.playerKills || {};
      for (const value of Object.values(playerKills)) {
        const playerKillCount = Number(value);
        if (!Number.isFinite(playerKillCount) || playerKillCount < 0) {
          return res.status(400).json({ message: 'Player kills cannot be negative' });
        }
      }

      usedTeams.add(teamId);
      usedPlacements.add(placement);
    }

    const teamCount = await Team.countDocuments({
      _id: { $in: [...usedTeams] },
      organizerId: getOrganizerId(req),
    });
    if (teamCount !== usedTeams.size) {
      return res.status(400).json({ message: 'One or more result teams were not found' });
    }

    await MatchResult.deleteMany({ matchId, organizerId: getOrganizerId(req) });

    const matchResultsData = results.map((r) => {
      let killPoints = 0;
      let placementPoints = 0;

      if (scoringRule) {
        killPoints = (r.kills || 0) * (scoringRule.killPoints || 0);
        const placementKey = r.placement.toString();
        if (scoringRule.placementPoints?.get?.(placementKey) !== undefined) {
          placementPoints = scoringRule.placementPoints.get(placementKey);
        } else if (scoringRule.placementPoints?.[placementKey] !== undefined) {
          placementPoints = scoringRule.placementPoints[placementKey];
        }
      } else {
        killPoints = r.kills || 0;
        const defaultPlacements = {
          1: 15,
          2: 12,
          3: 10,
          4: 8,
          5: 6,
          6: 4,
          7: 2,
          8: 1,
        };
        placementPoints = defaultPlacements[r.placement] || 0;
      }

      const totalPoints = r.isBanned ? 0 : killPoints + placementPoints;

      return {
        organizerId: getOrganizerId(req),
        matchId,
        teamId: r.teamId,
        placement: r.placement,
        kills: r.kills || 0,
        playerKills: r.playerKills || {},
        totalPoints,
        isBanned: r.isBanned || false,
      };
    });

    const savedResults = await MatchResult.insertMany(matchResultsData);

    match.status = savedResults.length > 0 ? 'Completed' : 'Pending Results';
    await match.save();

    const populated = await MatchResult.find({ matchId }).populate('teamId');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMatchResults = async (req, res) => {
  try {
    const match = await findReadableMatch(req, req.params.matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    const organizerId = ownerIdFor(req, match);

    const results = await MatchResult.find({
      matchId: req.params.matchId,
      organizerId,
    }).populate('teamId');

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEventLeaderboard = async (req, res) => {
  try {
    const event = await findReadableEvent(req, req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    await event.populate('scoringRuleId');
    const killPointValue = event.scoringRuleId?.killPoints ?? 1;
    const organizerId = ownerIdFor(req, event);

    const matches = await Match.find({
      eventId: req.params.eventId,
      organizerId,
      status: 'Completed',
    });
    const matchIds = matches.map((m) => m._id);

    const results = await MatchResult.aggregate([
      {
        $match: {
          matchId: { $in: matchIds },
          organizerId,
        },
      },
      {
        $group: {
          _id: '$teamId',
          totalMatches: { $sum: 1 },
          totalKills: { $sum: '$kills' },
          killPoints: {
            $sum: {
              $cond: [
                { $eq: ['$isBanned', true] },
                0,
                { $multiply: ['$kills', killPointValue] },
              ],
            },
          },
          totalPoints: { $sum: '$totalPoints' },
          wwcd: { $sum: { $cond: [{ $eq: ['$placement', 1] }, 1, 0] } },
        },
      },
      { $sort: { totalPoints: -1, totalKills: -1, wwcd: -1 } },
    ]);

    await MatchResult.populate(results, { path: '_id', model: 'Team' });

    const leaderboard = results.map((r, index) => ({
      rank: index + 1,
      team: r._id,
      totalMatches: r.totalMatches,
      totalKills: r.totalKills,
      positionPoints: r.totalPoints - r.killPoints,
      killPoints: r.killPoints,
      totalPoints: r.totalPoints,
      wwcd: r.wwcd,
    }));

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

async function getCompletedMatchesWithResults(eventId, organizerId) {
  const matches = await Match.find({
    eventId,
    organizerId,
    status: 'Completed',
  }).sort({ order: 1, createdAt: 1 });

  const matchIdsWithResults = await MatchResult.distinct('matchId', {
    matchId: { $in: matches.map((m) => m._id) },
    organizerId,
  });
  const hasResults = new Set(matchIdsWithResults.map((id) => id.toString()));
  return matches.filter((match) => hasResults.has(match._id.toString()));
}

exports.getEventStandings = async (req, res) => {
  try {
    const event = await findReadableEvent(req, req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    await event.populate('scoringRuleId');
    const organizerId = ownerIdFor(req, event);

    const view = req.query.view === 'single-match' ? 'single-match' : 'till-match';
    const type = req.query.type === 'fraggers' ? 'fraggers' : 'points';
    const matchNumber = Math.max(1, Number(req.query.matchNumber || 1));
    const completedMatches = await getCompletedMatchesWithResults(req.params.eventId, organizerId);
    const selectedIndex = Math.min(matchNumber - 1, Math.max(completedMatches.length - 1, 0));
    const selectedMatch = completedMatches[selectedIndex];
    const selectedMatches =
      view === 'single-match'
        ? selectedMatch ? [selectedMatch] : []
        : completedMatches.slice(0, selectedIndex + 1);
    const matchIds = selectedMatches.map((match) => match._id);

    if (matchIds.length === 0) return res.json([]);

    if (type === 'fraggers') {
      const rows = await MatchResult.aggregate([
        {
          $match: {
            matchId: { $in: matchIds },
            organizerId,
          },
        },
        {
          $lookup: {
            from: 'teams',
            localField: 'teamId',
            foreignField: '_id',
            as: 'team',
          },
        },
        { $unwind: '$team' },
        { $project: { teamName: '$team.name', playerKills: { $objectToArray: { $ifNull: ['$playerKills', {}] } } } },
        { $unwind: '$playerKills' },
        { $match: { 'playerKills.v': { $gt: 0 } } },
        {
          $group: {
            _id: { player: '$playerKills.k', team: '$teamName' },
            matchesPlayed: { $sum: 1 },
            kills: { $sum: '$playerKills.v' },
          },
        },
        { $sort: { kills: -1, matchesPlayed: 1 } },
      ]);

      return res.json(rows.map((row, index) => ({
        rank: index + 1,
        player: row._id.player,
        team: row._id.team,
        matchesPlayed: row.matchesPlayed,
        kills: row.kills,
        averageKills: Number((row.kills / row.matchesPlayed).toFixed(1)),
      })));
    }

    const killPointValue = event.scoringRuleId?.killPoints ?? 1;
    const rows = await MatchResult.aggregate([
        {
          $match: {
            matchId: { $in: matchIds },
            organizerId,
          },
        },
      {
        $lookup: {
          from: 'teams',
          localField: 'teamId',
          foreignField: '_id',
          as: 'team',
        },
      },
      { $unwind: '$team' },
      {
        $group: {
          _id: '$teamId',
          team: { $first: '$team.name' },
          matchesPlayed: { $sum: 1 },
          wins: { $sum: { $cond: [{ $eq: ['$placement', 1] }, 1, 0] } },
          position: { $min: '$placement' },
          totalKills: { $sum: '$kills' },
          killPoints: {
            $sum: {
              $cond: [
                { $eq: ['$isBanned', true] },
                0,
                { $multiply: ['$kills', killPointValue] },
              ],
            },
          },
          totalPoints: { $sum: '$totalPoints' },
        },
      },
    ]);

    const mapped = rows
      .map((row) => {
        return {
          team: row.team,
          matchesPlayed: row.matchesPlayed,
          wins: row.wins,
          ...(view === 'single-match' ? { position: row.position } : {}),
          positionPoints: row.totalPoints - row.killPoints,
          killPoints: row.killPoints,
          totalPoints: row.totalPoints,
        };
      })
      .sort((a, b) =>
        view === 'single-match'
          ? (a.position ?? 0) - (b.position ?? 0)
          : b.totalPoints - a.totalPoints || b.wins - a.wins,
      )
      .map((row, index) => ({ ...row, rank: index + 1 }));

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
