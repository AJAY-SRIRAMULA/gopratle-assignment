'use client';

import { NumberField, SelectField, TextAreaField, TextField, CheckboxGroup } from './Fields';
import { needsOther } from '../lib/constants';

// Renders one field from its config definition (plus its "Other" follow-up input).
// `section` is "details" or "additionalDetails"; it also prefixes ids and error keys.
export default function FieldRenderer({ field, section, store, errors, onChange }) {
  const path = `${section}.${field.key}`;
  const id = `f-${section}-${field.key}`;
  const raw = store[field.key];
  const common = { id, label: field.label, required: field.required, hint: field.hint, error: errors[path] };

  let control;
  if (field.type === 'select') {
    control = <SelectField {...common} value={raw ?? ''} options={field.options} onChange={(v) => onChange(field.key, v)} />;
  } else if (field.type === 'number') {
    control = <NumberField {...common} value={raw ?? ''} prefix={field.prefix} suffix={field.suffix} onChange={(v) => onChange(field.key, v)} />;
  } else if (field.type === 'textarea') {
    control = <TextAreaField {...common} value={raw ?? ''} onChange={(v) => onChange(field.key, v)} />;
  } else if (field.type === 'checkboxes') {
    control = <CheckboxGroup {...common} value={raw ?? []} options={field.options} onChange={(v) => onChange(field.key, v)} />;
  } else {
    control = <TextField {...common} value={raw ?? ''} onChange={(v) => onChange(field.key, v)} />;
  }

  return (
    <>
      {control}
      {needsOther(field, raw) ? (
        <TextField
          id={`f-${section}-${field.otherKey}`} label={field.otherLabel} required
          value={store[field.otherKey] ?? ''}
          error={errors[`${section}.${field.otherKey}`]}
          onChange={(v) => onChange(field.otherKey, v)}
        />
      ) : null}
    </>
  );
}
