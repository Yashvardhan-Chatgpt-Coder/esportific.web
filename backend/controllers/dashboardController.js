const Event = require('../models/Event');
const Team = require('../models/Team');
const ScoringRule = require('../models/ScoringRule');
const { getOrganizerId } = require('../utils/tenant');

exports.getSummary = async (req, res) => {
  try {
    const organizerId = getOrganizerId(req);
    const [eventsCount, teamsCount, scoringRulesCount, recentEvents] = await Promise.all([
      Event.countDocuments({ organizerId, status: 'Ongoing' }),
      Team.countDocuments({
        organizerId,
        isPoolTeam: { $ne: false },
        source: { $ne: 'event' },
      }),
      ScoringRule.countDocuments({
        isTemplate: { $ne: false },
        $or: [{ organizerId }, { isPlatform: true }],
      }),
      Event.find({ organizerId })
        .select('name game gameId format startDate endDate status teams createdAt')
        .populate('gameId', 'name logo logoLight logoDark')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    res.json({ eventsCount, teamsCount, scoringRulesCount, recentEvents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
