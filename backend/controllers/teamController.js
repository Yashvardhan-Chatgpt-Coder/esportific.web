const XLSX = require('xlsx');
const Team = require('../models/Team');
const Event = require('../models/Event');
const MatchResult = require('../models/MatchResult');
const cloudinary = require('../config/cloudinary');
const { getOrganizerId, findOwned } = require('../utils/tenant');
const { CLOUDINARY_FOLDERS } = require('../utils/cloudinaryFolders');
const { added, changed, createUserLog, createUserLogs, removed } = require('../utils/userLogs');

const TEAM_IMPORT_HEADERS = [
  'Slot Number',
  'Team Name',
  'Tags',
  'Country Code',
  'Phone Number',
  'Players',
  'Save to Database',
];

const POOL_TEAM_IMPORT_HEADERS = [
  'Team Name',
  'Tags',
  'Country Code',
  'Phone Number',
];

const TEAM_IMPORT_SAMPLE_ROWS = [
  ['1', 'Team Phoenix', 'Invited, Pro', '+91', '98765 43210', 'Player 1, Player 2, Player 3, Player 4', 'No'],
  ['2', 'Deadly Squad', 'Qualifier', '+91', '98765 43211', 'Aryan, Rohit, Kabir, Dev', 'Yes'],
];

const POOL_TEAM_IMPORT_SAMPLE_ROWS = [
  ['Team Phoenix', 'Invited, Pro', '+91', '98765 43210'],
  ['Deadly Squad', 'Qualifier', '+91', '98765 43211'],
];

function extractPublicId(url) {
  if (!url || !url.includes('res.cloudinary.com')) return null;
  const parts = url.split('/upload/');
  if (parts.length < 2) return null;

  let path = parts[1];
  const firstSlash = path.indexOf('/');
  if (path.startsWith('v') && firstSlash !== -1 && !isNaN(path.substring(1, firstSlash))) {
    path = path.substring(firstSlash + 1);
  }

  const lastDot = path.lastIndexOf('.');
  if (lastDot !== -1) {
    path = path.substring(0, lastDot);
  }

  return path;
}

function parseJsonField(value, fallback) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function parseBooleanField(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value === 'true';
  }
  return fallback;
}

function plainPlayers(players = []) {
  return players.map((player, index) => ({
    playerId: String(player.playerId || `slot-${index + 1}`),
    name: String(player.name || '').trim(),
    inGameId: String(player.inGameId || '').trim(),
  }));
}

function playerNames(players = []) {
  return plainPlayers(players).map((player) => player.name || player.playerId).filter(Boolean);
}

function buildPlayerChanges(previousPlayers = [], nextPlayers = []) {
  const previous = plainPlayers(previousPlayers);
  const next = plainPlayers(nextPlayers);
  const previousById = new Map(previous.map((player) => [player.playerId, player]));
  const nextById = new Map(next.map((player) => [player.playerId, player]));
  const deletedPlayers = previous.filter((player) => !nextById.has(player.playerId));
  const addedPlayers = next.filter((player) => !previousById.has(player.playerId));
  const changes = [];

  for (const player of previous) {
    const nextPlayer = nextById.get(player.playerId);
    if (!nextPlayer) continue;
    const nameChange = changed(
      `players.${player.playerId}.name`,
      'Player name',
      player.name,
      nextPlayer.name,
      `Changed player name from ${player.name || 'empty'} to ${nextPlayer.name || 'empty'}.`,
    );
    if (nameChange) changes.push(nameChange);
    const idChange = changed(
      `players.${player.playerId}.inGameId`,
      'Player in-game ID',
      player.inGameId,
      nextPlayer.inGameId,
      `Changed ${nextPlayer.name || player.name || 'player'} in-game ID.`,
    );
    if (idChange) changes.push(idChange);
  }

  if (addedPlayers.length > 0) {
    const names = playerNames(addedPlayers);
    changes.push(added('players', 'players', names, `Added players ${names.join(', ')}.`));
  }
  if (deletedPlayers.length > 0) {
    const names = playerNames(deletedPlayers);
    changes.push(removed('players', 'players', names, `Deleted players ${names.join(', ')}.`));
  }

  return changes;
}

function shouldLogTeamActivity(team) {
  return team.isPoolTeam !== false && team.source !== 'event' && !team.sourceEventId;
}

exports.getPlayerSuggestions = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 500, 1), 1000);
    const rows = await Team.aggregate([
      { $match: { organizerId: getOrganizerId(req) } },
      { $unwind: '$players' },
      {
        $project: {
          name: { $trim: { input: { $ifNull: ['$players.name', ''] } } },
          updatedAt: 1,
        },
      },
      { $match: { name: { $ne: '' } } },
      { $sort: { updatedAt: -1 } },
      {
        $group: {
          _id: { $toLower: '$name' },
          name: { $first: '$name' },
          lastUsedAt: { $first: '$updatedAt' },
          usageCount: { $sum: 1 },
        },
      },
      { $sort: { lastUsedAt: -1, name: 1 } },
      { $limit: limit },
      { $project: { _id: 0, name: 1 } },
    ]);

    res.json(rows.map((row) => row.name));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createTeam = async (req, res) => {
  try {
    const { name, tags, players, contactMobile, notes, source, sourceEventId, sourceEventName } = req.body;
    const isPoolTeam = parseBooleanField(req.body.isPoolTeam, true);
    let logoUrl = '';

    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: CLOUDINARY_FOLDERS.TEAM_LOGOS,
        format: 'webp',
        quality: 'auto:eco',
        transformation: [{ width: 256, height: 256, crop: 'limit' }],
      });
      logoUrl = result.secure_url;
    }

    const team = new Team({
      organizerId: getOrganizerId(req),
      name,
      tags: parseJsonField(tags, []),
      contactMobile: contactMobile || '',
      notes: notes || '',
      players: parseJsonField(players, []),
      logoUrl,
      isPoolTeam,
      source: source === 'event' || !isPoolTeam ? 'event' : 'pool',
      sourceEventId: sourceEventId || null,
      sourceEventName: sourceEventName || '',
    });

    await team.save();
    if (shouldLogTeamActivity(team)) {
      await createUserLog(req, {
        category: 'activity',
        action: 'team_created',
        message: `Created team ${team.name}.`,
        metadata: {
          teamId: team._id,
          players: playerNames(team.players),
          tags: team.tags,
          contactMobile: team.contactMobile,
        },
      });
    }
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createTeamsBulk = async (req, res) => {
  try {
    const inputs = req.body?.teams;
    if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > 500) {
      return res.status(400).json({ message: 'Provide between 1 and 500 teams.' });
    }

    const normalized = inputs.map((input) => ({
      name: String(input?.name || '').trim(),
      tags: Array.isArray(input?.tags) ? input.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
      contactMobile: String(input?.contactMobile || '').trim(),
      notes: String(input?.notes || '').trim(),
    }));
    if (normalized.some((team) => !team.name)) {
      return res.status(400).json({ message: 'Every team needs a name.' });
    }

    const createdTeams = await Team.insertMany(normalized.map((team) => ({
      organizerId: getOrganizerId(req),
      ...team,
      players: [],
      logoUrl: '',
      isPoolTeam: true,
      source: 'pool',
      sourceEventId: null,
      sourceEventName: '',
    })), { ordered: true });

    await createUserLogs(req, createdTeams.map((team) => ({
      category: 'activity',
      action: 'team_created',
      message: `Created team ${team.name}.`,
      metadata: {
        teamId: team._id,
        players: [],
        tags: team.tags,
        contactMobile: team.contactMobile,
      },
    })));

    res.status(201).json(createdTeams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTeams = async (req, res) => {
  try {
    const includeEventTeams = req.query.includeEventTeams === 'true';
    const filter = { organizerId: getOrganizerId(req) };
    if (!includeEventTeams) {
      filter.isPoolTeam = { $ne: false };
    }
    const paginated = req.query.page !== undefined;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 40));
    const search = String(req.query.search || '').trim();
    const source = req.query.source === 'pool' || req.query.source === 'event'
      ? req.query.source
      : null;
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { contactMobile: { $regex: escapedSearch, $options: 'i' } },
        { notes: { $regex: escapedSearch, $options: 'i' } },
        { tags: { $regex: escapedSearch, $options: 'i' } },
      ];
    }
    if (source === 'event') {
      filter.$and = [...(filter.$and || []), { $or: [
        { source: 'event' },
        { sourceEventId: { $ne: null } },
        { sourceEventName: { $ne: '' } },
      ] }];
    } else if (source === 'pool') {
      filter.source = { $ne: 'event' };
      filter.sourceEventId = null;
      filter.sourceEventName = { $in: ['', null] };
    }

    const query = Team.find(filter).sort({ createdAt: -1 });
    if (paginated) {
      const [total, teams] = await Promise.all([
        Team.countDocuments(filter),
        query.skip((page - 1) * limit).limit(limit).lean(),
      ]);
      return res.json({ items: teams, total, page, limit });
    }
    const teams = await query;
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTeamById = async (req, res) => {
  try {
    const team = await findOwned(Team, req, req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const team = await findOwned(Team, req, req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const { name, tags, players, contactMobile, notes, source, sourceEventId, sourceEventName } = req.body;
    const oldLogoUrl = team.logoUrl;
    const previous = {
      name: team.name,
      tags: [...(team.tags || [])],
      contactMobile: team.contactMobile || '',
      notes: team.notes || '',
      players: plainPlayers(team.players || []),
      logoUrl: team.logoUrl || '',
      isPoolTeam: team.isPoolTeam,
      source: team.source,
      sourceEventId: team.sourceEventId,
      sourceEventName: team.sourceEventName,
    };

    if (name) team.name = name;
    if (tags !== undefined) team.tags = parseJsonField(tags, team.tags);
    if (contactMobile !== undefined) team.contactMobile = contactMobile || '';
    if (notes !== undefined) team.notes = notes || '';
    if (players !== undefined) team.players = parseJsonField(players, team.players);
    if (req.body.isPoolTeam !== undefined) team.isPoolTeam = parseBooleanField(req.body.isPoolTeam, team.isPoolTeam);
    if (source !== undefined) team.source = source === 'event' ? 'event' : 'pool';
    if (sourceEventId !== undefined) team.sourceEventId = sourceEventId || null;
    if (sourceEventName !== undefined) team.sourceEventName = sourceEventName || '';

    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: CLOUDINARY_FOLDERS.TEAM_LOGOS,
        format: 'webp',
        quality: 'auto:eco',
        transformation: [{ width: 256, height: 256, crop: 'limit' }],
      });
      team.logoUrl = result.secure_url;

      if (oldLogoUrl) {
        const publicId = extractPublicId(oldLogoUrl);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId).catch((err) => {
            console.error('Failed to delete orphaned logo from Cloudinary:', err);
          });
        }
      }
    } else if (parseBooleanField(req.body.removeLogo, false)) {
      team.logoUrl = null;
      if (oldLogoUrl) {
        const publicId = extractPublicId(oldLogoUrl);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId).catch((err) => {
            console.error('Failed to delete removed logo from Cloudinary:', err);
          });
        }
      }
    }

    await team.save();
    if (shouldLogTeamActivity(previous)) {
      const changes = [
        changed('team.name', 'Team name', previous.name, team.name),
        changed('team.tags', 'Tags', previous.tags, team.tags || []),
        changed('team.contactMobile', 'Mobile number', previous.contactMobile, team.contactMobile || ''),
        changed('team.notes', 'Notes', previous.notes, team.notes || ''),
        changed('team.logoUrl', 'Logo', previous.logoUrl, team.logoUrl || '', 'Changed team logo.'),
        changed('team.isPoolTeam', 'Team pool status', previous.isPoolTeam, team.isPoolTeam),
        ...buildPlayerChanges(previous.players, team.players || []),
      ].filter(Boolean);

      if (changes.length > 0) {
        await createUserLog(req, {
          category: 'activity',
          action: 'team_updated',
          message: `Updated team ${team.name}.`,
          changes,
          metadata: { teamId: team._id },
        });
      }
    }
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const team = await findOwned(Team, req, req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const organizerId = getOrganizerId(req);
    const [eventUsageCount, resultUsageCount] = await Promise.all([
      Event.countDocuments({ organizerId, teams: team._id }),
      MatchResult.countDocuments({ organizerId, teamId: team._id }),
    ]);

    if (eventUsageCount > 0 || resultUsageCount > 0) {
      team.isPoolTeam = false;
      await team.save();
      if (shouldLogTeamActivity({ ...team.toObject(), isPoolTeam: true, source: team.source, sourceEventId: team.sourceEventId })) {
        await createUserLog(req, {
          category: 'activity',
          action: 'team_removed_from_pool',
          message: `Removed team ${team.name} from team pool.`,
          metadata: { teamId: team._id },
        });
      }

      return res.json({
        message: 'Team removed from pool. Event and match history were preserved.',
        removedFromPoolOnly: true,
      });
    }

    if (team.logoUrl) {
      const publicId = extractPublicId(team.logoUrl);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId).catch((err) => {
          console.error('Failed to delete team logo from Cloudinary upon deletion:', err);
        });
      }
    }

    await team.deleteOne();
    if (shouldLogTeamActivity(team)) {
      await createUserLog(req, {
        category: 'activity',
        action: 'team_deleted',
        message: `Deleted team ${team.name}.`,
        metadata: { teamId: team._id },
      });
    }
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTeamStats = async (req, res) => {
  try {
    const teamId = req.params.id;
    const organizerId = getOrganizerId(req);

    const team = await findOwned(Team, req, teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    // 1. Matches played & Match Results
    const matchResults = await MatchResult.find({ organizerId, teamId });
    const matchesPlayed = matchResults.length;

    // 2. Last event
    let lastEvent = null;
    const events = await Event.find({
      organizerId,
      $or: [
        { teams: teamId },
        ...(team.sourceEventId ? [{ _id: team.sourceEventId }] : []),
      ],
    }).sort({ createdAt: -1 }).limit(1);

    if (events.length > 0) {
      lastEvent = {
        eventId: String(events[0]._id),
        eventName: events[0].name,
      };
    } else if (team.sourceEventName) {
      lastEvent = {
        eventId: team.sourceEventId ? String(team.sourceEventId) : null,
        eventName: team.sourceEventName,
      };
    }

    // 3. Top Fraggers
    const playerKillsMap = {};

    for (const result of matchResults) {
      if (result.playerKills) {
        let pkMap = {};
        if (result.playerKills instanceof Map) {
          pkMap = Object.fromEntries(result.playerKills);
        } else if (typeof result.playerKills === 'object') {
          pkMap = result.playerKills;
        }

        for (const [pKey, kills] of Object.entries(pkMap)) {
          const numKills = Number(kills) || 0;
          playerKillsMap[pKey] = (playerKillsMap[pKey] || 0) + numKills;
        }
      }
    }

    const playersList = (team.players || []).map((p, idx) => {
      const pId = p.playerId || `slot-${idx + 1}`;
      const pName = p.name || 'Player';
      const kills = (playerKillsMap[pId] || 0) + (playerKillsMap[pName] || 0);
      return {
        playerId: pId,
        name: pName,
        kills,
      };
    });

    for (const [pKey, kills] of Object.entries(playerKillsMap)) {
      if (!playersList.some((p) => p.playerId === pKey || p.name === pKey)) {
        if (kills > 0) {
          playersList.push({
            playerId: pKey,
            name: pKey,
            kills,
          });
        }
      }
    }

    playersList.sort((a, b) => b.kills - a.kills);

    res.json({
      teamId: String(team._id),
      matchesPlayed,
      lastEvent,
      topFraggers: playersList,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.downloadTemplate = async (req, res) => {
  try {
    const mode = req.query.mode === 'pool' ? 'pool' : 'event';
    const headers = mode === 'pool' ? POOL_TEAM_IMPORT_HEADERS : TEAM_IMPORT_HEADERS;
    const sampleRows = mode === 'pool' ? POOL_TEAM_IMPORT_SAMPLE_ROWS : TEAM_IMPORT_SAMPLE_ROWS;
    const filename =
      mode === 'pool'
        ? 'Esportific_Team_Pool_Import_Template.xlsx'
        : 'Esportific_Team_Roster_Import_Template.xlsx';

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    worksheet['!cols'] =
      mode === 'event'
        ? [{ wch: 14 }, { wch: 26 }, { wch: 22 }, { wch: 14 }, { wch: 20 }, { wch: 44 }, { wch: 18 }]
        : [{ wch: 28 }, { wch: 24 }, { wch: 14 }, { wch: 20 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Teams');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (err) {
    console.error('Error generating Excel template:', err);
    return res.status(500).json({ message: 'Error generating template' });
  }
};
