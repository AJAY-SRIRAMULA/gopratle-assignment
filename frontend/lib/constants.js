// Single source of truth for options, limits and the per-category field definitions.
// The step screens, validation, payload builder and review page are all driven by this
// config, so a field only has to be described once.

export const LIMITS = {
  eventName: 120,
  location: 120,
  venue: 150,
  short: 120,
  long: 1000,
};

export const EVENT_TYPES = [
  'Wedding', 'Birthday', 'Corporate Event', 'Concert',
  'Festival', 'Private Party', 'Conference', 'Other',
];

export const CATEGORIES = [
  { value: 'planner', label: 'Event Planner', icon: 'ClipboardList', description: 'Someone to plan, coordinate or consult on the whole event or parts of it.' },
  { value: 'performer', label: 'Performer', icon: 'Music', description: 'Singers, DJs, bands, dancers, hosts and other on-stage entertainment.' },
  { value: 'crew', label: 'Crew', icon: 'Camera', description: 'Photographers, videographers, technicians and event assistants.' },
];

export const categoryLabel = (value) => CATEGORIES.find((c) => c.value === value)?.label ?? '';

const opts = (...list) => list;

// Field definition keys:
//   key, label, type (text | number | select | textarea | checkboxes), required, options,
//   min, max, integer, prefix, suffix, hint, maxLength,
//   otherKey: name of a follow-up text field shown when "Other" is chosen.
const budget = {
  key: 'budget', label: 'Estimated budget', type: 'number', required: true,
  min: 0, max: 100000000, prefix: '₹', hint: 'Amount in INR (₹). Enter 0 if undecided.',
};
const instructions = {
  key: 'additionalInstructions', label: 'Additional instructions', type: 'textarea',
  maxLength: LIMITS.long, hint: 'Anything else the professional should know.',
};

export const CATEGORY_FIELDS = {
  planner: {
    details: [
      { key: 'planningType', label: 'Planning service type', type: 'select', required: true,
        options: opts('Full event planning', 'Partial planning', 'Day-of coordination', 'Event consultation') },
      { key: 'guestCount', label: 'Expected guest count', type: 'number', required: true, integer: true, min: 1, max: 100000, suffix: 'guests' },
      { ...budget },
      { key: 'services', label: 'Services required', type: 'checkboxes', required: true, otherKey: 'servicesOther', otherLabel: 'Describe the other service',
        options: opts('Decoration', 'Catering coordination', 'Venue coordination', 'Guest management', 'Entertainment coordination', 'Logistics', 'Other') },
      { key: 'preferredExperience', label: 'Preferred planner experience', type: 'select', required: true,
        hint: 'Your preference only. GoPratle Requirements does not verify anyone’s qualifications.',
        options: opts('Beginner or emerging', 'Experienced', 'Highly experienced', 'No preference') },
    ],
    additional: [
      { key: 'theme', label: 'Preferred event theme', type: 'text', maxLength: LIMITS.long, hint: 'For example: traditional, minimal, floral.' },
      { key: 'decorationPreferences', label: 'Decoration or setup preferences', type: 'textarea', maxLength: LIMITS.long },
      { key: 'specialArrangements', label: 'Special arrangements', type: 'textarea', maxLength: LIMITS.long },
      { ...instructions },
    ],
  },
  performer: {
    details: [
      { key: 'performanceType', label: 'Performance category', type: 'select', required: true, otherKey: 'performanceTypeOther', otherLabel: 'Describe the performance category',
        options: opts('Singer', 'DJ', 'Band', 'Dancer', 'Instrumentalist', 'Host or emcee', 'Other') },
      { key: 'durationMinutes', label: 'Performance duration', type: 'number', required: true, min: 1, max: 1440, suffix: 'minutes' },
      { key: 'performerCount', label: 'Number of performers', type: 'number', required: true, integer: true, min: 1, max: 500 },
      { key: 'style', label: 'Performance style', type: 'text', required: true, maxLength: LIMITS.short, hint: 'For example: Bollywood, classical, EDM, acoustic.' },
      { ...budget },
      { key: 'technicalRequirements', label: 'Technical requirements', type: 'textarea', maxLength: LIMITS.long, hint: 'Sound, stage, lighting, equipment or other needs.' },
    ],
    additional: [
      { key: 'audienceType', label: 'Audience type', type: 'text', maxLength: LIMITS.long, hint: 'For example: family, corporate guests, college crowd.' },
      { key: 'stageSetup', label: 'Stage or venue setup requirements', type: 'textarea', maxLength: LIMITS.long },
      { key: 'performancePreferences', label: 'Performance preferences', type: 'textarea', maxLength: LIMITS.long },
      { ...instructions },
    ],
  },
  crew: {
    details: [
      { key: 'crewRole', label: 'Crew role', type: 'select', required: true, otherKey: 'crewRoleOther', otherLabel: 'Describe the crew role',
        options: opts('Photographer', 'Videographer', 'Lighting technician', 'Sound technician', 'Stage crew', 'Event assistant', 'Other') },
      { key: 'crewCount', label: 'Number of crew members', type: 'number', required: true, integer: true, min: 1, max: 1000 },
      { key: 'durationHours', label: 'Required working duration', type: 'number', required: true, min: 0.5, max: 168, suffix: 'hours', hint: 'At least 0.5 hours.' },
      { ...budget },
      { key: 'equipmentRequirements', label: 'Equipment requirements', type: 'textarea', maxLength: LIMITS.long },
      { key: 'additionalRoleRequirements', label: 'Additional role requirements', type: 'textarea', maxLength: LIMITS.long },
    ],
    additional: [
      { key: 'setupTeardown', label: 'Setup and teardown requirements', type: 'textarea', maxLength: LIMITS.long },
      { key: 'equipmentAvailability', label: 'Equipment availability', type: 'textarea', maxLength: LIMITS.long, hint: 'What is already available at the venue?' },
      { key: 'workingConditions', label: 'Working conditions or logistics', type: 'textarea', maxLength: LIMITS.long },
      { ...instructions },
    ],
  },
};

export const STEPS = [
  { id: 1, title: 'Event basics' },
  { id: 2, title: 'Requirements' },
  { id: 3, title: 'More details' },
  { id: 4, title: 'Review' },
];

// Does this field currently need its follow-up "Other" text input?
export function needsOther(field, value) {
  if (!field.otherKey) return false;
  return field.type === 'checkboxes' ? Array.isArray(value) && value.includes('Other') : value === 'Other';
}
