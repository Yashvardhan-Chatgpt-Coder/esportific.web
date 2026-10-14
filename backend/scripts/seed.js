require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Team = require('../models/Team');
const Event = require('../models/Event');
const Match = require('../models/Match');
const MatchResult = require('../models/MatchResult');
const ScoringRule = require('../models/ScoringRule');
const GameCatalog = require('../models/GameCatalog');
const Notification = require('../models/Notification');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/esports_tool';
const TEST_ORGANIZER_EMAIL = 'organizer@test.rangrove.local';
const TEST_ADMIN_EMAIL = 'admin@test.rangrove.local';
const TEST_PASSWORD = 'superchat9897';

const placementPoints = {
  1: 15,
  2: 12,
  3: 10,
  4: 8,
  5: 6,
  6: 4,
  7: 2,
  8: 1,
};

const games = [
  {
    name: 'BGMI',
    logo: null,
    maps: ['Erangel', 'Miramar', 'Sanhok', 'Vikendi', 'Livik'],
    modes: ['Battle Royale', 'Scrims', 'Finals'],
  },
  {
    name: 'Valorant',
    logo: null,
    maps: ['Ascent', 'Bind', 'Haven', 'Split', 'Lotus'],
    modes: ['5v5', 'Best of 3', 'Best of 5'],
  },
  {
    name: 'Free Fire',
    logo: null,
    maps: ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine'],
    modes: ['Battle Royale', 'Clash Squad'],
  },
];

const teamNames = [
  'Rangrove Esports',
  'Alejandro Alihan',
  'The Order',
  'The OG',
  'Nigga',
  'Bdmash',
  'Velocity Crew',
  'Nova Strikers',
];

function playerName(teamIndex, playerIndex) {
  return `Player ${teamIndex + 1}${playerIndex + 1}`;
}

function buildPlayers(teamIndex) {
  return Array.from({ length: 4 }, (_, index) => ({
    playerId: `seed-p${teamIndex + 1}-${index + 1}`,
    name: playerName(teamIndex, index),
    inGameId: `${teamNames[teamIndex].replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase()}${index + 1}`,
  }));
}

function getPlayerKills(team, totalKills) {
  const kills = {};
  let remaining = totalKills;

  team.players.forEach((player, index) => {
    const isLast = index === team.players.length - 1;
    const value = isLast ? remaining : Math.floor(remaining / (team.players.length - index));
    kills[player.playerId] = value;
    remaining -= value;
  });

  return kills;
}

function calculatePoints(placement, kills, rule) {
  const placementScore = Number(rule.placementPoints.get(String(placement)) || 0);
  return placementScore + kills * Number(rule.killPoints || 0);
}

async function clearSeedData() {
  const seedUsers = await User.find({
    email: { $in: [TEST_ORGANIZER_EMAIL, TEST_ADMIN_EMAIL] },
  });
  const seedUserIds = seedUsers.map((user) => user._id);

  if (seedUserIds.length === 0) return;

  await MatchResult.deleteMany({ organizerId: { $in: seedUserIds } });
  await Match.deleteMany({ organizerId: { $in: seedUserIds } });
  await Event.deleteMany({ organizerId: { $in: seedUserIds } });
  await Team.deleteMany({ organizerId: { $in: seedUserIds } });
  await ScoringRule.deleteMany({ organizerId: { $in: seedUserIds } });
  await Notification.deleteMany({ userId: { $in: seedUserIds } });
  await User.deleteMany({ _id: { $in: seedUserIds } });
}

async function seedUsers() {
  const password = await bcrypt.hash(TEST_PASSWORD, 10);

  const organizer = await User.create({
    name: 'Test Organizer',
    email: TEST_ORGANIZER_EMAIL,
    password,
    phone: '+91 98765 43210',
    dob: new Date('1998-03-14'),
    gender: 'Prefer not to say',
    timezone: 'Asia/Kolkata',
    integrations: {
      discordWebhookUrl: 'https://discord.com/api/webhooks/test-seed',
      twitchChannelUrl: 'https://www.twitch.tv/rangrove',
    },
    role: 'organizer',
  });

  const admin = await User.create({
    name: 'Test Admin',
    email: TEST_ADMIN_EMAIL,
    password,
    timezone: 'Asia/Kolkata',
    role: 'admin',
  });

  return { organizer, admin };
}

async function seedCatalog() {
  for (const game of games) {
    await GameCatalog.findOneAndUpdate({ name: game.name }, game, { upsert: true, new: true });
  }
}

async function seedScoringRules(organizerId) {
  const platformRule = await ScoringRule.findOneAndUpdate(
    { name: 'Seed BGMI Classic', isPlatform: true },
    {
      organizerId: null,
      name: 'Seed BGMI Classic',
      format: 'battle_royale',
      description: 'Default seed rule for battle royale testing.',
      killPoints: 1,
      winPoints: 0,
      drawPoints: 0,
      lossPoints: 0,
      isPlatform: true,
      placementPoints,
    },
    { upsert: true, new: true },
  );

  const organizerRule = await ScoringRule.create({
    organizerId,
    name: 'Custom Finals Rule',
    format: 'battle_royale',
    description: 'Organizer-owned seed scoring rule for testing custom rules.',
    killPoints: 2,
    winPoints: 0,
    drawPoints: 0,
    lossPoints: 0,
    isPlatform: false,
    placementPoints,
  });

  return { platformRule, organizerRule };
}

async function seedTeams(organizerId) {
  return Team.insertMany(
    teamNames.map((name, index) => ({
      organizerId,
      name,
      tags: index % 2 === 0 ? ['invited', 'scrims'] : ['registered'],
      players: buildPlayers(index),
      isPoolTeam: index < 6,
      source: index < 6 ? 'pool' : 'event',
      sourceEventId: null,
      sourceEventName: index < 6 ? '' : 'Summer Showdown 2026',
    })),
  );
}

async function seedEventWithMatches(organizerId, scoringRule, teams) {
  const eventTeams = teams.slice(0, 6);
  const event = await Event.create({
    organizerId,
    name: 'Summer Showdown 2026',
    game: 'BGMI',
    format: 'Battle Royale',
    startDate: '2026-06-01',
    endDate: '2026-06-03',
    status: 'Ongoing',
    scoringRuleId: scoringRule._id,
    teams: eventTeams.map((team) => team._id),
  });

  await Team.updateMany(
    { _id: { $in: teams.slice(6).map((team) => team._id) } },
    { sourceEventId: event._id, sourceEventName: event.name },
  );

  const matches = await Match.insertMany([
    {
      organizerId,
      eventId: event._id,
      name: 'Match 1',
      map: 'Erangel',
      status: 'Completed',
      order: 0,
    },
    {
      organizerId,
      eventId: event._id,
      name: 'Match 2',
      map: 'Miramar',
      status: 'Completed',
      order: 1,
    },
    {
      organizerId,
      eventId: event._id,
      name: 'Match 3',
      map: 'Sanhok',
      status: 'Pending Results',
      order: 2,
    },
  ]);

  const resultOrders = [
    [0, 1, 2, 3, 4, 5],
    [2, 0, 4, 1, 5, 3],
  ];

  const results = [];
  resultOrders.forEach((order, matchIndex) => {
    order.forEach((teamIndex, placementIndex) => {
      const team = eventTeams[teamIndex];
      const placement = placementIndex + 1;
      const kills = Math.max(0, 12 - placement - matchIndex);
      results.push({
        organizerId,
        matchId: matches[matchIndex]._id,
        teamId: team._id,
        placement,
        kills,
        playerKills: getPlayerKills(team, kills),
        totalPoints: calculatePoints(placement, kills, scoringRule),
        isBanned: false,
      });
    });
  });

  await MatchResult.insertMany(results);

  return { event, matches };
}

async function seedDraftEvent(organizerId, scoringRule, teams) {
  return Event.create({
    organizerId,
    name: 'Valorant Campus Cup',
    game: 'Valorant',
    format: '5v5',
    startDate: '2026-06-12',
    endDate: '2026-06-12',
    status: 'Draft',
    scoringRuleId: scoringRule._id,
    teams: teams.slice(0, 2).map((team) => team._id),
  });
}

async function seedNotifications(userId) {
  await Notification.insertMany([
    {
      userId,
      title: 'Match results saved',
      description: 'Match 1 results were added for Summer Showdown 2026.',
      type: 'match',
      unread: true,
      time: new Date(),
    },
    {
      userId,
      title: 'New event ready',
      description: 'Valorant Campus Cup is available as a draft event.',
      type: 'system',
      unread: false,
      time: new Date(Date.now() - 1000 * 60 * 60),
    },
  ]);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${MONGO_URI}`);

  await clearSeedData();
  await seedCatalog();

  const { organizer, admin } = await seedUsers();
  const { platformRule, organizerRule } = await seedScoringRules(organizer._id);
  const teams = await seedTeams(organizer._id);
  const { event, matches } = await seedEventWithMatches(organizer._id, platformRule, teams);
  const draftEvent = await seedDraftEvent(organizer._id, organizerRule, teams);
  await seedNotifications(organizer._id);

  console.log('Seed complete.');
  console.table([
    { item: 'Organizer login', value: TEST_ORGANIZER_EMAIL },
    { item: 'Admin login', value: TEST_ADMIN_EMAIL },
    { item: 'Password', value: TEST_PASSWORD },
    { item: 'Games', value: games.length },
    { item: 'Teams', value: teams.length },
    { item: 'Events', value: [event, draftEvent].length },
    { item: 'Matches', value: matches.length },
  ]);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Seed failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
