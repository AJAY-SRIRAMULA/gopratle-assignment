'use client';

import { CATEGORY_FIELDS, categoryLabel } from '../lib/constants';
import FieldRenderer from './FieldRenderer';

const COPY = {
  details: {
    planner: ['Planning requirements', 'Tell us what kind of planning support you need.'],
    performer: ['Performance requirements', 'Describe the act you want to book.'],
    crew: ['Crew requirements', 'Describe the crew you need on the day.'],
  },
  additional: {
    planner: ['Planning preferences', 'Optional details that help planners understand your vision.'],
    performer: ['Stage and audience details', 'Optional details about the audience and setup.'],
    crew: ['Working conditions', 'Optional details about the setup, equipment and logistics.'],
  },
};

// Used for both step 2 ("details") and step 3 ("additional"); the fields come from the category config.
export default function StepCategory({ state, errors, section, setAnswer }) {
  const category = state.category;
  const fields = CATEGORY_FIELDS[category][section];
  const payloadKey = section === 'details' ? 'details' : 'additionalDetails';
  const store = state.answers[category][payloadKey];
  const [title, intro] = COPY[section][category];

  return (
    <div className="stack">
      <p className="section-intro"><span className="pill">{categoryLabel(category)}</span> {intro}</p>
      <h3 className="sr-only">{title}</h3>
      {fields.map((field) => (
        <FieldRenderer
          key={`${category}-${field.key}`} field={field} section={payloadKey} store={store} errors={errors}
          onChange={(key, value) => setAnswer(payloadKey, key, value)}
        />
      ))}
    </div>
  );
}
