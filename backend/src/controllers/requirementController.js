const mongoose = require('mongoose');
const Requirement = require('../models/Requirement');
const { validateRequirement } = require('../validators/requirementValidator');
const db = require('../config/db');

const dbUnavailable = (res) =>
  res.status(503).json({ success: false, message: 'Database is currently unavailable. Please try again shortly.' });

async function createRequirement(req, res) {
  const { errors, value } = validateRequirement(req.body);
  if (Object.keys(errors).length) {
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }
  if (!db.isDbReady()) return dbUnavailable(res);

  const saved = await Requirement.create(value);
  return res.status(201).json({
    success: true,
    message: 'Requirement created successfully',
    data: {
      id: saved._id.toString(),
      category: saved.category,
      eventName: saved.eventName,
      createdAt: saved.createdAt.toISOString(),
    },
  });
}

async function getRequirement(req, res) {
  const { id } = req.params;
  if (!/^[a-f\d]{24}$/i.test(id) || !mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid requirement ID' });
  }
  if (!db.isDbReady()) return dbUnavailable(res);

  const doc = await Requirement.findById(id).lean();
  if (!doc) return res.status(404).json({ success: false, message: 'Requirement not found' });

  const { _id, __v, ...rest } = doc;
  return res.json({ success: true, data: { id: _id.toString(), ...rest } });
}

module.exports = { createRequirement, getRequirement };
