'use client';

// Small, accessible form controls. Each one wires label, hint and error together
// with htmlFor / aria-describedby / aria-invalid.

import { TriangleAlert } from 'lucide-react';

function Shell({ id, label, required, hint, error, children, counter }) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {required ? <span className="req" aria-hidden="true"> *</span> : <span className="opt"> (optional)</span>}
      </label>
      {children}
      {hint && !error ? <p className="hint" id={`${id}-hint`}>{hint}</p> : null}
      {counter}
      {error ? (
        <p className="error" id={`${id}-error`} role="alert">
          <TriangleAlert size={15} aria-hidden="true" /> {error}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id, hint, error) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export function TextField({ id, label, value, onChange, required, hint, error, type = 'text', ...rest }) {
  return (
    <Shell id={id} label={label} required={required} hint={hint} error={error}>
      <input
        id={id} type={type} className="input" value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? 'true' : undefined} aria-required={required || undefined}
        aria-describedby={describedBy(id, hint, error)} {...rest}
      />
    </Shell>
  );
}

export function NumberField({ id, label, value, onChange, required, hint, error, prefix, suffix }) {
  return (
    <Shell id={id} label={label} required={required} hint={hint} error={error}>
      <div className={`input-group${error ? ' is-invalid' : ''}`}>
        {prefix ? <span className="affix" aria-hidden="true">{prefix}</span> : null}
        <input
          id={id} type="text" inputMode="decimal" className="input bare" value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? 'true' : undefined} aria-required={required || undefined}
          aria-describedby={describedBy(id, hint, error)}
        />
        {suffix ? <span className="affix" aria-hidden="true">{suffix}</span> : null}
      </div>
    </Shell>
  );
}

export function SelectField({ id, label, value, onChange, options, required, hint, error }) {
  return (
    <Shell id={id} label={label} required={required} hint={hint} error={error}>
      <select
        id={id} className="input select" value={value} onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? 'true' : undefined} aria-required={required || undefined}
        aria-describedby={describedBy(id, hint, error)}
      >
        <option value="">Select an option</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Shell>
  );
}

export function TextAreaField({ id, label, value, onChange, required, hint, error, maxLength }) {
  const length = value.length;
  return (
    <Shell
      id={id} label={label} required={required} hint={hint} error={error}
      counter={maxLength ? <p className={`counter${length > maxLength ? ' over' : ''}`} aria-live="off">{length}/{maxLength}</p> : null}
    >
      <textarea
        id={id} className="input textarea" rows={4} value={value} onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? 'true' : undefined} aria-required={required || undefined}
        aria-describedby={describedBy(id, hint, error)}
      />
    </Shell>
  );
}

export function CheckboxGroup({ id, label, options, value, onChange, required, hint, error }) {
  const toggle = (option) => onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  return (
    <fieldset className="field group" aria-describedby={describedBy(id, hint, error)} aria-invalid={error ? 'true' : undefined}>
      <legend className="label" id={id}>
        {label}
        {required ? <span className="req" aria-hidden="true"> *</span> : <span className="opt"> (optional)</span>}
      </legend>
      <div className="chips">
        {options.map((option) => {
          const checked = value.includes(option);
          return (
            <label key={option} className={`chip${checked ? ' on' : ''}`}>
              <input type="checkbox" checked={checked} onChange={() => toggle(option)} />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
      {hint && !error ? <p className="hint" id={`${id}-hint`}>{hint}</p> : null}
      {error ? <p className="error" id={`${id}-error`} role="alert"><TriangleAlert size={15} aria-hidden="true" /> {error}</p> : null}
    </fieldset>
  );
}
