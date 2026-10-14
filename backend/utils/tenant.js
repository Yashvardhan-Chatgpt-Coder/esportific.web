const mongoose = require('mongoose');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function getOrganizerId(req) {
  return req.user?._id;
}

async function findOwned(Model, req, id) {
  const doc = await Model.findOne({ _id: id, organizerId: getOrganizerId(req) });
  return doc;
}

async function findOwnedEvent(req, eventId) {
  const Event = require('../models/Event');
  return findOwned(Event, req, eventId);
}

async function findOwnedMatch(req, matchId) {
  const Match = require('../models/Match');
  return findOwned(Match, req, matchId);
}

module.exports = {
  isValidObjectId,
  getOrganizerId,
  findOwned,
  findOwnedEvent,
  findOwnedMatch,
};
