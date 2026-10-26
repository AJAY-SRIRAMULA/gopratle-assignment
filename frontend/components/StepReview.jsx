'use client';

import { Pencil } from 'lucide-react';
import { CATEGORY_FIELDS, categoryLabel, needsOther } from '../lib/constants';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Formats YYYY-MM-DD without creating a Date, so timezones can never shift the day.
export function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

function formatValue(field, value) {
  if (Array.isArray(value)) return value.join(', ');
  if (field.type === 'number') {
    const formatted = Number(value).toLocaleString('en-IN');
    return `${field.prefix ? `${field.prefix} ` : ''}${formatted}${field.suffix ? ` ${field.suffix}` : ''}`;
  }
  return String(value);
}

function Section({ title, onEdit, editLabel, rows }) {
  return (
    <section className="review-section" aria-label={title}>
      <div className="review-head">
        <h3>{title}</h3>
        <button type="button" className="btn-link" onClick={onEdit} aria-label={editLabel}><Pencil size={14} aria-hidden="true" /> Edit</button>
      </div>
      <dl className="review-list">
        {rows.map(([label, value]) => (
          <div key={label} className="review-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function fieldRows(fields, store) {
  const rows = [];
  for (const field of fields) {
    const value = store[field.key];
    const empty = value === undefined || (Array.isArray(value) && !value.length);
    rows.push([field.label, empty ? <span className="muted">Not provided</span> : formatValue(field, value)]);
    if (needsOther(field, value) && store[field.otherKey]) rows.push([field.otherLabel, store[field.otherKey]]);
  }
  return rows;
}

export default function StepReview({ payload, goToStep }) {
  const config = CATEGORY_FIELDS[payload.category];
  const eventType = payload.eventType === 'Other' ? `Other: ${payload.eventTypeOther}` : payload.eventType;
  const dates = payload.startDate === payload.endDate ? formatDate(payload.startDate) : `${formatDate(payload.startDate)} to ${formatDate(payload.endDate)}`;

  return (
    <div className="stack">
      <p className="section-intro">Check everything below. You can edit any section without losing your answers.</p>
      <Section
        title="Event basics" onEdit={() => goToStep(1)} editLabel="Edit event basics"
        rows={[
          ['Event name', payload.eventName],
          ['Event type', eventType],
          ['Date', dates],
          ['Location', payload.location],
          ['Venue', payload.venue || <span className="muted">Not provided</span>],
          ['Category', categoryLabel(payload.category)],
        ]}
      />
      <Section title={`${categoryLabel(payload.category)} requirements`} onEdit={() => goToStep(2)} editLabel="Edit requirements" rows={fieldRows(config.details, payload.details)} />
      <Section title="Additional details" onEdit={() => goToStep(3)} editLabel="Edit additional details" rows={fieldRows(config.additional, payload.additionalDetails)} />
    </div>
  );
}
