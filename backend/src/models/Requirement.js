const mongoose = require('mongoose');
const { validateRequirement, CATEGORIES } = require('../validators/requirementValidator');

const requirementSchema = new mongoose.Schema(
  {
    eventName: { type: String, required: true, trim: true, maxlength: 120 },
    eventType: { type: String, required: true, trim: true },
    eventTypeOther: { type: String, trim: true, maxlength: 120 },
    // Calendar dates stored as YYYY-MM-DD strings: no timezone shifting.
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    location: { type: String, required: true, trim: true, maxlength: 120 },
    venue: { type: String, trim: true, maxlength: 150 },
    category: { type: String, required: true, enum: CATEGORIES, index: true },
    // Shape depends on `category`; checked by the validator hook below.
    details: { type: mongoose.Schema.Types.Mixed, required: true },
    additionalDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false }
);

// A Mixed field alone guarantees nothing, so re-run the category-aware
// validator before every save. This keeps category and details consistent.
requirementSchema.pre('validate', function () {
  const { errors } = validateRequirement(this.toObject());
  const messages = Object.values(errors);
  if (messages.length) {
    this.invalidate('details', messages.join('; '));
  }
});

module.exports = mongoose.model('Requirement', requirementSchema);
