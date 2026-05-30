import { useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * OnboardingTour
 *
 * Four-step coachmark walkthrough that auto-starts the first time a
 * new user lands on the populated Dashboard. Each step targets an
 * existing UI element via CSS selector, drops a brand-coloured ring
 * around it, and floats a small popover nearby with the explanation +
 * Next / Previous / Skip controls.
 *
 * Dismissal is persisted in UserPreferences.onboardingDismissed so the
 * tour never replays. The "Skip tour" button is equivalent to "Got it"
 * on the final step — both set the flag and unmount.
 *
 * Accessibility:
 *   - The popover is role="dialog" / aria-modal="true" so SR users hear
 *     it as a context shift.
 *   - The target element is highlighted with a visible ring + aria-
 *     describedby pointing at the popover's body id.
 *   - Esc closes (acts as Skip).
 *   - Focus moves into the popover's Next button on each step.
 *
 * No external dependencies (no react-joyride, no react-tour).
 */

type Step = {
  id: string;
  selector: string;
  title: string;
  body: string;
  /** Where the popover sits relative to the target. */
  position?: 'top' | 'bottom' | 'left' | 'right';
};

const STEPS: Step[] = [
  {
    id: 'score',
    selector: '[data-testid="score-card-overall"]',
    title: 'Your score, at a glance',
    body:
      'Each ring is a 0–100 composite. The pill underneath tells you the band: Good (≥ 90), Needs attention (70–89), or Action required (under 70).',
    position: 'bottom',
  },
  {
    id: 'filter',
    selector: '[data-testid="score-card-accessibility"] [data-filter*="critical"]',
    title: 'Filter by severity',
    body:
      'Click any Critical / Warning / Info tally to narrow the findings list to that slice. Click it again to clear. Same tally on the Overall card filters by severity only.',
    position: 'bottom',
  },
  {
    id: 'findings',
    selector: '[data-testid="findings-list"]',
    title: 'Findings link to your code',
    body:
      'Click any row to expand the inline fix preview (description + before / after diff). The arrow on the right opens the file in the Analyzer at the exact line.',
    position: 'top',
  },
  {
    id: 'assistant',
    selector: 'a[href*="reports"]',
    title: 'Ask the Assistant',
    body:
      'When you hit something you don\'t understand, head to Reports → Ask assistant and type a question in plain English. It references your actual findings.',
    position: 'right',
  },
];

type Props = {
  /** Called when the user finishes or skips the tour. */
  onDismiss: () => void;
};

export function OnboardingTour({ onDismiss }: Props) {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = STEPS[stepIdx];

  // Locate target + scroll into view. Re-run on resize so the popover
  // tracks the element if the page reflows.
  useLayoutEffect(() => {
    let el: HTMLElement | null = null;
    let frame = 0;
    function locate() {
      el = document.querySelector<HTMLElement>(step.selector);
      if (!el) {
        // Target may not be mounted yet on the first paint after a
        // route change — retry on the next frame.
        frame = window.requestAnimationFrame(locate);
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    }
    locate();

    function refresh() {
      if (!el) return;
      setTargetRect(el.getBoundingClientRect());
    }
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    const ro = new ResizeObserver(refresh);
    if (el) ro.observe(el);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
      ro.disconnect();
    };
  }, [step.selector]);

  // Escape closes the tour entirely.
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        onDismiss();
      } else if (ev.key === 'ArrowRight' || ev.key === 'Enter') {
        ev.preventDefault();
        if (stepIdx < STEPS.length - 1) setStepIdx((i) => i + 1);
        else onDismiss();
      } else if (ev.key === 'ArrowLeft') {
        ev.preventDefault();
        if (stepIdx > 0) setStepIdx((i) => i - 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepIdx, onDismiss]);

  if (!targetRect) return null;

  // Compute the popover position. We pick the side that fits in viewport;
  // simple two-axis snap (no full-blown collision logic — fine for our
  // dashboard layout where target elements have plenty of room).
  const POPOVER_W = 320;
  const POPOVER_OFFSET = 12;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const tooLowForBottom = targetRect.bottom + POPOVER_OFFSET + 200 > vh;
  const tooTightForTop = targetRect.top - POPOVER_OFFSET - 200 < 0;
  const tooFarRight = targetRect.right + POPOVER_OFFSET + POPOVER_W > vw;

  let popoverStyle: React.CSSProperties = {};
  let actualPosition: 'top' | 'bottom' | 'left' | 'right' = step.position ?? 'bottom';
  if (actualPosition === 'right' && tooFarRight) actualPosition = 'bottom';
  if (actualPosition === 'bottom' && tooLowForBottom && !tooTightForTop) actualPosition = 'top';

  if (actualPosition === 'bottom') {
    popoverStyle = {
      top: targetRect.bottom + POPOVER_OFFSET,
      left: Math.max(8, Math.min(vw - POPOVER_W - 8, targetRect.left)),
    };
  } else if (actualPosition === 'top') {
    popoverStyle = {
      bottom: vh - targetRect.top + POPOVER_OFFSET,
      left: Math.max(8, Math.min(vw - POPOVER_W - 8, targetRect.left)),
    };
  } else if (actualPosition === 'right') {
    popoverStyle = {
      top: Math.max(8, targetRect.top),
      left: targetRect.right + POPOVER_OFFSET,
    };
  } else {
    popoverStyle = {
      top: Math.max(8, targetRect.top),
      right: vw - targetRect.left + POPOVER_OFFSET,
    };
  }

  const isFirst = stepIdx === 0;
  const isLast = stepIdx === STEPS.length - 1;

  return (
    <>
      {/* Spotlight ring around the target element. pointer-events-none so the
          user can still interact with what's underneath if they want. */}
      <div
        aria-hidden
        data-testid="onboarding-spotlight"
        className="pointer-events-none fixed z-40 rounded-lg ring-4 ring-brand-500 ring-offset-2 ring-offset-white shadow-2xl transition-all duration-200 dark:ring-offset-slate-950"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
        }}
      />
      {/* Popover */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        data-testid="onboarding-tour"
        data-step={step.id}
        className="card fixed z-50 w-80 p-4 shadow-xl"
        style={popoverStyle}
      >
        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          <span>
            Step {stepIdx + 1} of {STEPS.length}
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close tour"
            data-testid="onboarding-close"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>
        <h3
          id="tour-title"
          className="text-sm font-semibold text-slate-900 dark:text-slate-100"
        >
          {step.title}
        </h3>
        <p id="tour-body" className="mt-1 text-xs text-slate-700 dark:text-slate-300">
          {step.body}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="text-[11px] text-slate-500 hover:underline dark:text-slate-400"
            data-testid="onboarding-skip"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-1">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStepIdx((i) => i - 1)}
                className="btn-ghost text-xs"
                data-testid="onboarding-prev"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  // The final step nudges toward the Assistant — accepting
                  // also navigates there as a friendly hand-off.
                  navigate('/reports');
                  onDismiss();
                } else {
                  setStepIdx((i) => i + 1);
                }
              }}
              className="btn-primary text-xs"
              data-testid="onboarding-next"
              autoFocus
            >
              {isLast ? 'Open Assistant' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
