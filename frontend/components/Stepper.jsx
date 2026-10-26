import { Check } from 'lucide-react';
import { STEPS } from '../lib/constants';

export default function Stepper({ current }) {
  return (
    <nav className="stepper" aria-label="Progress">
      <p className="stepper-mobile" aria-hidden="true">Step {current} of {STEPS.length} · {STEPS[current - 1].title}</p>
      <ol>
        {STEPS.map((step) => {
          const state = step.id < current ? 'done' : step.id === current ? 'current' : 'todo';
          return (
            <li key={step.id} className={`step ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="dot" aria-hidden="true">{state === 'done' ? <Check size={14} strokeWidth={3} /> : step.id}</span>
              <span className="step-title">
                {step.title}
                <span className="sr-only">{state === 'done' ? ' (completed)' : state === 'current' ? ' (current step)' : ' (not started)'}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
