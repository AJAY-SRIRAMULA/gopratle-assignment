// Server-side validation. Independent of the frontend: it builds a brand-new
// sanitized object from a whitelist, so unknown fields never reach MongoDB.

const CATEGORIES = ['planner', 'performer', 'crew'];

const EVENT_TYPES = [
  'Wedding', 'Birthday', 'Corporate Event', 'Concert',
  'Festival', 'Private Party', 'Conference', 'Other',
];

const LIMITS = {
  eventName: 120,
  location: 120,
  venue: 150,
  short: 120,
  long: 1000,
  maxGuests: 100000,
  maxBudget: 100000000,
  maxMinutes: 1440,
  maxPerformers: 500,
  maxCrew: 1000,
  maxHours: 168,
};

const PLANNER = {
  planningType: ['Full event planning', 'Partial planning', 'Day-of coordination', 'Event consultation'],
  services: ['Decoration', 'Catering coordination', 'Venue coordination', 'Guest management', 'Entertainment coordination', 'Logistics', 'Other'],
  preferredExperience: ['Beginner or emerging', 'Experienced', 'Highly experienced', 'No preference'],
};
const PERFORMER = {
  performanceType: ['Singer', 'DJ', 'Band', 'Dancer', 'Instrumentalist', 'Host or emcee', 'Other'],
};
const CREW = {
  crewRole: ['Photographer', 'Videographer', 'Lighting technician', 'Sound technician', 'Stage crew', 'Event assistant', 'Other'],
};

// Fields allowed in each category's `details` / `additionalDetails`.
const ADDITIONAL_FIELDS = {
  planner: ['theme', 'decorationPreferences', 'specialArrangements', 'additionalInstructions'],
  performer: ['audienceType', 'stageSetup', 'performancePreferences', 'additionalInstructions'],
  crew: ['setupTeardown', 'equipmentAvailability', 'workingConditions', 'additionalInstructions'],
};
const DETAIL_FIELDS = {
  planner: ['planningType', 'guestCount', 'budget', 'services', 'servicesOther', 'preferredExperience'],
  performer: ['performanceType', 'performanceTypeOther', 'durationMinutes', 'performerCount', 'style', 'budget', 'technicalRequirements'],
  crew: ['crewRole', 'crewRoleOther', 'crewCount', 'durationHours', 'equipmentRequirements', 'budget', 'additionalRoleRequirements'],
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function isRealDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Accepts numbers or numeric strings, rejects NaN/Infinity/"", booleans, arrays.
function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (typeof v === 'string' && v.trim() !== '' && /^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v.trim());
  return NaN;
}

function validateRequirement(body) {
  const errors = {};
  const value = {};

  if (!isPlainObject(body)) {
    return { errors: { body: 'Request body must be a JSON object' }, value: null };
  }

  const text = (src, key, { required = false, max, label, target, path }) => {
    const raw = src[key];
    const errKey = path || key;
    if (raw === undefined || raw === null || raw === '') {
      if (required) errors[errKey] = `${label} is required`;
      return '';
    }
    if (typeof raw !== 'string') {
      errors[errKey] = `${label} must be text`;
      return '';
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      if (required) errors[errKey] = `${label} is required`;
      return '';
    }
    if (trimmed.length > max) {
      errors[errKey] = `${label} must be at most ${max} characters`;
      return '';
    }
    if (target) target[key] = trimmed;
    return trimmed;
  };

  const oneOf = (src, key, options, { label, path, target }) => {
    const raw = src[key];
    const errKey = path || key;
    if (typeof raw !== 'string' || !raw.trim()) {
      errors[errKey] = `${label} is required`;
      return null;
    }
    if (!options.includes(raw.trim())) {
      errors[errKey] = `${label} is not a valid option`;
      return null;
    }
    target[key] = raw.trim();
    return raw.trim();
  };

  const number = (src, key, { label, min, max, integer, path, target }) => {
    const errKey = path || key;
    const n = toNumber(src[key]);
    if (Number.isNaN(n)) {
      errors[errKey] = `${label} must be a valid number`;
      return;
    }
    if (integer && !Number.isInteger(n)) {
      errors[errKey] = `${label} must be a whole number`;
      return;
    }
    if (n < min) {
      errors[errKey] = min === 0 ? `${label} cannot be negative` : `${label} must be greater than 0`;
      return;
    }
    if (n > max) {
      errors[errKey] = `${label} must be at most ${max}`;
      return;
    }
    target[key] = n;
  };

  // ---- Common event fields ----
  text(body, 'eventName', { required: true, max: LIMITS.eventName, label: 'Event name', target: value });
  oneOf(body, 'eventType', EVENT_TYPES, { label: 'Event type', target: value });

  if (value.eventType === 'Other') {
    text(body, 'eventTypeOther', { required: true, max: LIMITS.short, label: 'Custom event type', target: value });
  }

  // Dates are kept as YYYY-MM-DD strings so no timezone conversion can shift them.
  const startOk = isRealDate(body.startDate);
  if (!startOk) errors.startDate = body.startDate ? 'Start date is not a valid date (YYYY-MM-DD)' : 'Start date is required';
  else value.startDate = body.startDate;

  if (body.endDate === undefined || body.endDate === null || body.endDate === '') {
    if (startOk) value.endDate = body.startDate; // single-day event
  } else if (!isRealDate(body.endDate)) {
    errors.endDate = 'End date is not a valid date (YYYY-MM-DD)';
  } else {
    value.endDate = body.endDate;
    if (startOk && body.endDate < body.startDate) errors.endDate = 'End date cannot be before the start date';
  }

  text(body, 'location', { required: true, max: LIMITS.location, label: 'Location', target: value });
  const venue = text(body, 'venue', { max: LIMITS.venue, label: 'Venue' });
  if (venue) value.venue = venue;

  // ---- Category ----
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  if (!category) {
    errors.category = 'Category is required';
  } else if (!CATEGORIES.includes(category)) {
    errors.category = `Category must be one of: ${CATEGORIES.join(', ')}`;
  } else {
    value.category = category;
  }

  // ---- Category-specific ----
  if (value.category) {
    const rawDetails = body.details === undefined ? {} : body.details;
    const rawExtra = body.additionalDetails === undefined ? {} : body.additionalDetails;

    if (!isPlainObject(rawDetails)) errors.details = 'details must be an object';
    if (!isPlainObject(rawExtra)) errors.additionalDetails = 'additionalDetails must be an object';

    if (isPlainObject(rawDetails) && isPlainObject(rawExtra)) {
      // Reject fields that don't belong to the chosen category (e.g. guestCount on a crew requirement).
      for (const key of Object.keys(rawDetails)) {
        if (!DETAIL_FIELDS[value.category].includes(key)) errors[`details.${key}`] = `"${key}" is not a valid field for ${value.category} requirements`;
      }
      for (const key of Object.keys(rawExtra)) {
        if (!ADDITIONAL_FIELDS[value.category].includes(key)) errors[`additionalDetails.${key}`] = `"${key}" is not a valid field for ${value.category} requirements`;
      }

      const details = {};
      const d = (key, opts) => ({ ...opts, path: `details.${key}`, target: details });

      if (value.category === 'planner') {
        oneOf(rawDetails, 'planningType', PLANNER.planningType, d('planningType', { label: 'Planning service type' }));
        number(rawDetails, 'guestCount', d('guestCount', { label: 'Guest count', min: 1, max: LIMITS.maxGuests, integer: true }));
        number(rawDetails, 'budget', d('budget', { label: 'Budget', min: 0, max: LIMITS.maxBudget }));
        oneOf(rawDetails, 'preferredExperience', PLANNER.preferredExperience, d('preferredExperience', { label: 'Preferred experience' }));

        const services = rawDetails.services;
        if (!Array.isArray(services) || services.length === 0) {
          errors['details.services'] = 'Select at least one service';
        } else if (services.length > PLANNER.services.length || services.some((s) => typeof s !== 'string' || !PLANNER.services.includes(s))) {
          errors['details.services'] = 'Services contains an invalid option';
        } else {
          details.services = [...new Set(services)];
          if (details.services.includes('Other')) {
            text(rawDetails, 'servicesOther', { required: true, max: LIMITS.short, label: 'Other service', path: 'details.servicesOther', target: details });
          } else if (rawDetails.servicesOther) {
            errors['details.servicesOther'] = 'Other service is only allowed when "Other" is selected';
          }
        }
      }

      if (value.category === 'performer') {
        const type = oneOf(rawDetails, 'performanceType', PERFORMER.performanceType, d('performanceType', { label: 'Performance category' }));
        if (type === 'Other') text(rawDetails, 'performanceTypeOther', { required: true, max: LIMITS.short, label: 'Custom performance category', path: 'details.performanceTypeOther', target: details });
        else if (rawDetails.performanceTypeOther) errors['details.performanceTypeOther'] = 'Custom category is only allowed when "Other" is selected';
        number(rawDetails, 'durationMinutes', d('durationMinutes', { label: 'Performance duration', min: 1, max: LIMITS.maxMinutes }));
        number(rawDetails, 'performerCount', d('performerCount', { label: 'Number of performers', min: 1, max: LIMITS.maxPerformers, integer: true }));
        text(rawDetails, 'style', { required: true, max: LIMITS.short, label: 'Performance style', path: 'details.style', target: details });
        number(rawDetails, 'budget', d('budget', { label: 'Budget', min: 0, max: LIMITS.maxBudget }));
        text(rawDetails, 'technicalRequirements', { max: LIMITS.long, label: 'Technical requirements', path: 'details.technicalRequirements', target: details });
      }

      if (value.category === 'crew') {
        const role = oneOf(rawDetails, 'crewRole', CREW.crewRole, d('crewRole', { label: 'Crew role' }));
        if (role === 'Other') text(rawDetails, 'crewRoleOther', { required: true, max: LIMITS.short, label: 'Custom crew role', path: 'details.crewRoleOther', target: details });
        else if (rawDetails.crewRoleOther) errors['details.crewRoleOther'] = 'Custom role is only allowed when "Other" is selected';
        number(rawDetails, 'crewCount', d('crewCount', { label: 'Number of crew members', min: 1, max: LIMITS.maxCrew, integer: true }));
        number(rawDetails, 'durationHours', d('durationHours', { label: 'Working duration', min: 0.5, max: LIMITS.maxHours }));
        number(rawDetails, 'budget', d('budget', { label: 'Budget', min: 0, max: LIMITS.maxBudget }));
        text(rawDetails, 'equipmentRequirements', { max: LIMITS.long, label: 'Equipment requirements', path: 'details.equipmentRequirements', target: details });
        text(rawDetails, 'additionalRoleRequirements', { max: LIMITS.long, label: 'Additional role requirements', path: 'details.additionalRoleRequirements', target: details });
      }

      const additionalDetails = {};
      for (const key of ADDITIONAL_FIELDS[value.category]) {
        if (rawExtra[key] !== undefined) {
          text(rawExtra, key, { max: LIMITS.long, label: key, path: `additionalDetails.${key}`, target: additionalDetails });
        }
      }

      value.details = details;
      value.additionalDetails = additionalDetails;
    }
  }

  return { errors, value };
}

module.exports = {
  validateRequirement,
  CATEGORIES,
  EVENT_TYPES,
  LIMITS,
  isRealDate,
};
