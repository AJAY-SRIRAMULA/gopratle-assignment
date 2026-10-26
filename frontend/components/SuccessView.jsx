'use client';

import { CircleCheck, RotateCcw } from 'lucide-react';
import { categoryLabel } from '../lib/constants';

export default function SuccessView({ result, onReset }) {
  return (
    <div className="success" role="status">
      <span className="success-icon" aria-hidden="true"><CircleCheck size={40} /></span>
      <h2 tabIndex={-1} id="success-heading">Requirement submitted</h2>
      <p className="lead">Your requirement was saved. Keep the reference below for your records.</p>
      <dl className="success-card">
        <div><dt>Reference ID</dt><dd className="mono" data-testid="requirement-id">{result.id}</dd></div>
        <div><dt>Category</dt><dd>{categoryLabel(result.category)}</dd></div>
        <div><dt>Event</dt><dd>{result.eventName}</dd></div>
      </dl>
      <button type="button" className="btn primary" onClick={onReset}><RotateCcw size={16} aria-hidden="true" /> Start a new requirement</button>
    </div>
  );
}
