'use client';

import { CalendarDays, Camera, Check, ClipboardList, Music } from 'lucide-react';
import { CATEGORIES, EVENT_TYPES, LIMITS } from '../lib/constants';
import { SelectField, TextField } from './Fields';

const ICONS = { ClipboardList, Music, Camera };

export default function StepBasics({ state, errors, setCommon }) {
  return (
    <div className="stack">
      <TextField
        id="f-eventName" label="Event name" required value={state.eventName}
        onChange={(v) => setCommon('eventName', v)} error={errors.eventName} placeholder="e.g. Priya & Arjun's Wedding"
      />
      <SelectField
        id="f-eventType" label="Event type" required value={state.eventType} options={EVENT_TYPES}
        onChange={(v) => setCommon('eventType', v)} error={errors.eventType}
      />
      {state.eventType === 'Other' ? (
        <TextField
          id="f-eventTypeOther" label="Describe your event type" required value={state.eventTypeOther}
          onChange={(v) => setCommon('eventTypeOther', v)} error={errors.eventTypeOther}
        />
      ) : null}

      <div className="grid-2">
        <TextField
          id="f-startDate" type="date" label={state.multiDay ? 'Start date' : 'Event date'} required
          value={state.startDate} onChange={(v) => setCommon('startDate', v)} error={errors.startDate}
        />
        {state.multiDay ? (
          <TextField
            id="f-endDate" type="date" label="End date" required min={state.startDate || undefined}
            value={state.endDate} onChange={(v) => setCommon('endDate', v)} error={errors.endDate}
          />
        ) : null}
      </div>
      <label className="check-inline">
        <input type="checkbox" checked={state.multiDay} onChange={(e) => setCommon('multiDay', e.target.checked)} />
        <span><CalendarDays size={16} aria-hidden="true" /> This event runs for more than one day</span>
      </label>

      <div className="grid-2">
        <TextField
          id="f-location" label="Location" required value={state.location}
          onChange={(v) => setCommon('location', v)} error={errors.location} placeholder="City or area" hint="Where will the event take place?"
        />
        <TextField
          id="f-venue" label="Venue" value={state.venue}
          onChange={(v) => setCommon('venue', v)} error={errors.venue} placeholder="Hall, hotel or address" hint="Skip this if the venue isn't decided yet."
        />
      </div>

      <fieldset className="field group" aria-describedby={errors.category ? 'f-category-error' : 'f-category-hint'}>
        <legend className="label">Who do you need? <span className="req" aria-hidden="true">*</span></legend>
        <div className="category-grid" role="radiogroup" aria-label="Category" aria-required="true">
          {CATEGORIES.map((cat) => {
            const Icon = ICONS[cat.icon];
            const selected = state.category === cat.value;
            return (
              <label key={cat.value} className={`category-card${selected ? ' selected' : ''}`}>
                <input
                  type="radio" name="category" value={cat.value} checked={selected}
                  onChange={() => setCommon('category', cat.value)} id={`f-category-${cat.value}`}
                />
                <span className="category-icon" aria-hidden="true"><Icon size={22} /></span>
                <span className="category-name">{cat.label}</span>
                <span className="category-desc">{cat.description}</span>
                <span className="category-check" aria-hidden="true">{selected ? <><Check size={14} strokeWidth={3} /> Selected</> : 'Select'}</span>
              </label>
            );
          })}
        </div>
        {errors.category ? (
          <p className="error" id="f-category-error" role="alert">{errors.category}</p>
        ) : (
          <p className="hint" id="f-category-hint">
            You can switch later. Answers for each category are kept while you work, but only the selected category is submitted.
          </p>
        )}
      </fieldset>
    </div>
  );
}
