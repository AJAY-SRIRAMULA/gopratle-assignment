const express = require('express');
const { createRequirement, getRequirement } = require('../controllers/requirementController');

const router = express.Router();

// Reject non-JSON bodies early with a clear message.
router.post('/', (req, res, next) => {
  if (!req.is('application/json')) {
    return res.status(415).json({ success: false, message: 'Content-Type must be application/json' });
  }
  next();
}, createRequirement);

router.get('/:id', getRequirement);

module.exports = router;
