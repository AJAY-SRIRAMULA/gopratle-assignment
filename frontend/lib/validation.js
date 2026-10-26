import { CATEGORY_FIELDS, CATEGORIES, EVENT_TYPES, LIMITS, needsOther } from './constants.js';

// Errors are keyed by path: "eventName", "details.budget", "additionalDetails.theme".
// The same keys come back from the server, so both can be shown by the same inputs.

export function isRealDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function validateBasics(state) {
  const errors = {};
  const name = state.eventName.trim();
  if (!name) errors.eventName = 'Enter an event name';
  else if (name.length > LIMITS.eventName) errors.eventName = `Event name must be at most ${LIMITS.eventName} characters`;

  if (!state.eventType) errors.eventType = 'Choose an event type';
  else if (!EVENT_TYPES.includes(state.eventType)) errors.eventType = 'Choose a valid event type';
  else if (state.eventType === 'Other') {
    const other = state.eventTypeOther.trim();
    if (!other) errors.eventTypeOther = 'Describe the event type';
    else if (other.length > LIMITS.short) errors.eventTypeOther = `Must be at most ${LIMITS.short} characters`;
  }

  if (!state.startDate) errors.startDate = 'Choose a start date';
  else if (!isRealDate(state.startDate)) errors.startDate = 'Enter a valid start date';

  if (state.multiDay) {
    if (!state.endDate) errors.endDate = 'Choose an end date';
    else if (!isRealDate(state.endDate)) errors.endDate = 'Enter a valid end date';
    else if (!errors.startDate && state.endDate < state.startDate) errors.endDate = 'End date cannot be before the start date';
  }

  const location = state.location.trim();
  if (!location) errors.location = 'Enter a location';
  else if (location.length > LIMITS.location) errors.location = `Location must be at most ${LIMITS.location} characters`;

  if (state.venue.trim().length > LIMITS.venue) errors.venue = `Venue must be at most ${LIMITS.venue} characters`;

  if (!state.category) errors.category = 'Choose a category';
  else if (!CATEGORIES.some((c) => c.value === state.category)) errors.category = 'Choose a valid category';
  return errors;
}

function validateField(field, raw, path, errors) {
  if (field.type === 'checkboxes') {
    if (field.required && (!Array.isArray(raw) || raw.length === 0)) errors[path] = 'Select at least one option';
    return;
  }
  const text = raw === undefined || raw === null ? '' : String(raw).trim();
  if (!text) {
    if (field.required) errors[path] = field.type === 'select' ? 'Choose an option' : 'This field is required';
    return;
  }
  if (field.type === 'number') {
    if (!/^-?\d+(\.\d+)?$/.test(text)) { errors[path] = 'Enter a valid number'; return; }
    const n = Number(text);
    if (field.integer && !Number.isInteger(n)) errors[path] = 'Enter a whole number';
    else if (n < field.min) errors[path] = field.min === 0 ? 'Cannot be negative' : `Must be at least ${field.min}`;
    else if (n > field.max) errors[path] = `Must be at most ${field.max.toLocaleString('en-IN')}`;
    return;
  }
  if (field.type === 'select' && !field.options.includes(text)) { errors[path] = 'Choose a valid option'; return; }
  if (field.maxLength && text.length > field.maxLength) errors[path] = `Must be at most ${field.maxLength} characters`;
}

function validateSection(state, configKey, payloadKey) {
  const errors = {};
  if (!state.category) return errors;
  const store = state.answers[state.category][payloadKey];
  for (const field of CATEGORY_FIELDS[state.category][configKey]) {
    validateField(field, store[field.key], `${payloadKey}.${field.key}`, errors);
    if (needsOther(field, store[field.key])) {
      const other = (store[field.otherKey] ?? '').trim();
      const path = `${payloadKey}.${field.otherKey}`;
      if (!other) errors[path] = 'Please describe this option';
      else if (other.length > LIMITS.short) errors[path] = `Must be at most ${LIMITS.short} characters`;
    }
  }
  return errors;
}

export const validateDetails = (state) => validateSection(state, 'details', 'details');
export const validateAdditional = (state) => validateSection(state, 'additional', 'additionalDetails');

export function validateStep(step, state) {
  if (step === 1) return validateBasics(state);
  if (step === 2) return validateDetails(state);
  if (step === 3) return validateAdditional(state);
  return {};
}

// Which step does an error key belong to? Used to send the user back to the right place.
export function stepForErrorKey(key) {
  if (key.startsWith('additionalDetails.')) return 3;
  if (key.startsWith('details.')) return 2;
  return 1;
}

export function validateAll(state) {
  return { ...validateBasics(state), ...validateDetails(state), ...validateAdditional(state) };
}
