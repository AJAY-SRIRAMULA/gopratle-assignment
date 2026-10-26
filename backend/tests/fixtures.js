const base = {
  eventName: 'Wedding Celebration',
  eventType: 'Wedding',
  startDate: '2026-12-15',
  endDate: '2026-12-16',
  location: 'Hyderabad',
  venue: 'Grand Convention Hall',
};

const planner = () => ({
  ...base,
  category: 'planner',
  details: {
    planningType: 'Full event planning',
    guestCount: 500,
    budget: 300000,
    services: ['Decoration', 'Catering coordination'],
    preferredExperience: 'Experienced',
  },
  additionalDetails: { theme: 'Traditional', specialArrangements: 'Stage decoration' },
});

const performer = () => ({
  ...base,
  eventName: 'Sangeet Night',
  category: 'performer',
  details: {
    performanceType: 'Singer',
    durationMinutes: 90,
    performerCount: 2,
    style: 'Bollywood',
    budget: 50000,
    technicalRequirements: 'Two wireless mics',
  },
  additionalDetails: { audienceType: 'Family', stageSetup: '12x8 ft stage' },
});

const crew = () => ({
  ...base,
  eventName: 'Corporate Summit',
  eventType: 'Conference',
  category: 'crew',
  details: {
    crewRole: 'Photographer',
    crewCount: 3,
    durationHours: 8,
    budget: 40000,
    equipmentRequirements: 'Full-frame cameras',
  },
  additionalDetails: { setupTeardown: 'Arrive 1 hour early' },
});

module.exports = { planner, performer, crew };
