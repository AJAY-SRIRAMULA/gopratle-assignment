'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CircleAlert, LoaderCircle } from 'lucide-react';
import Stepper from './Stepper';
import StepBasics from './StepBasics';
import StepCategory from './StepCategory';
import StepReview from './StepReview';
import SuccessView from './SuccessView';
import { createInitialState, buildPayload } from '../lib/formState';
import { stepForErrorKey, validateAll, validateStep } from '../lib/validation';
import { ApiError, createRequirement } from '../lib/api';
import { STEPS, categoryLabel } from '../lib/constants';

const STEP_HEADINGS = {
  1: ['Event basics', 'Start with the essentials about your event.'],
  2: ['Your requirements', 'Questions tailored to the category you picked.'],
  3: ['More details', 'Optional extras that help professionals respond well.'],
  4: ['Review and submit', 'One last look before you send it.'],
};

export default function RequirementWizard() {
  const [state, setState] = useState(createInitialState);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState(null);
  const submittingRef = useRef(false); // blocks double clicks before React re-renders
  const headingRef = useRef(null);
  const firstRender = useRef(true);

  // Move focus to the step heading when the step changes (keyboard / screen reader users).
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus();
  }, [step, result]);

  const clearError = (path) => setErrors((prev) => {
    if (!prev[path]) return prev;
    const { [path]: _removed, ...rest } = prev;
    return rest;
  });

  const setCommon = (key, value) => {
    setState((prev) => ({ ...prev, [key]: value }));
    clearError(key);
    if (key === 'multiDay') clearError('endDate');
    if (key === 'category') setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.includes('.'))));
  };

  const setAnswer = (section, key, value) => {
    setState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [prev.category]: {
          ...prev.answers[prev.category],
          [section]: { ...prev.answers[prev.category][section], [key]: value },
        },
      },
    }));
    clearError(`${section}.${key}`);
  };

  const focusFirstError = (errs) => {
    const first = Object.keys(errs)[0];
    if (!first) return;
    const id = first.includes('.') ? `f-${first.replace('.', '-')}` : `f-${first}`;
    // wait for the step to render before looking for the element
    setTimeout(() => (document.getElementById(id) ?? document.getElementById(`f-category-${state.category || 'planner'}`))?.focus(), 0);
  };

  const goNext = () => {
    const errs = validateStep(step, state);
    setErrors(errs);
    if (Object.keys(errs).length) { focusFirstError(errs); return; }
    setSubmitError('');
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const goBack = () => { setErrors({}); setSubmitError(''); setStep((s) => Math.max(s - 1, 1)); };
  const goToStep = (n) => { setErrors({}); setSubmitError(''); setStep(n); };

  const payload = useMemo(() => buildPayload(state), [state]);

  const submit = async () => {
    if (submittingRef.current) return;
    const errs = validateAll(state);
    if (Object.keys(errs).length) {
      setErrors(errs);
      setStep(Math.min(...Object.keys(errs).map(stepForErrorKey)));
      focusFirstError(errs);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      const data = await createRequirement(buildPayload(state));
      setResult(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Nothing was saved. Please try again.';
      setSubmitError(message);
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        // Server-side validation disagreed: show its messages on the right fields and step.
        setErrors(err.fieldErrors);
        setStep(Math.min(...Object.keys(err.fieldErrors).map(stepForErrorKey)));
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const reset = () => {
    setState(createInitialState());
    setErrors({});
    setSubmitError('');
    setResult(null);
    setStep(1);
  };

  if (result) return <div className="card"><SuccessView result={result} onReset={reset} /></div>;

  const [title, subtitle] = STEP_HEADINGS[step];

  return (
    <>
      <Stepper current={step} />
      <form
        className="card" noValidate
        onSubmit={(e) => {
          // Enter key: advance on steps 1-3, never submit accidentally on the review step.
          e.preventDefault();
          if (step < 4) goNext();
        }}
      >
        <header className="card-head">
          <p className="eyebrow">Step {step} of {STEPS.length}{step > 1 && state.category ? ` · ${categoryLabel(state.category)}` : ''}</p>
          <h2 ref={headingRef} tabIndex={-1}>{title}</h2>
          <p className="muted">{subtitle}</p>
        </header>

        {submitError ? (
          <div className="alert" role="alert">
            <CircleAlert size={20} aria-hidden="true" />
            <div>
              <strong>Your requirement was not saved.</strong>
              <p>{submitError}</p>
              {Object.keys(errors).length ? <p>Please fix the highlighted fields and try again.</p> : <p>Your answers are still here, so you can try again.</p>}
            </div>
          </div>
        ) : null}

        {step === 1 && <StepBasics state={state} errors={errors} setCommon={setCommon} />}
        {step === 2 && <StepCategory state={state} errors={errors} section="details" setAnswer={setAnswer} />}
        {step === 3 && <StepCategory state={state} errors={errors} section="additional" setAnswer={setAnswer} />}
        {step === 4 && <StepReview payload={payload} goToStep={goToStep} />}

        <footer className="actions">
          {step > 1 ? (
            <button type="button" className="btn ghost" onClick={goBack} disabled={submitting}>
              <ArrowLeft size={16} aria-hidden="true" /> Previous
            </button>
          ) : <span />}
          {step < 4 ? (
            <button type="button" className="btn primary" onClick={goNext}>
              Continue <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={submit} disabled={submitting} aria-busy={submitting}>
              {submitting ? <><LoaderCircle size={16} className="spin" aria-hidden="true" /> Submitting…</> : 'Submit requirement'}
            </button>
          )}
        </footer>
        {submitting ? <p className="muted center" role="status">Sending to the server. This can take a few seconds if it is waking up.</p> : null}
      </form>
    </>
  );
}
