import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

/**
 * OnboardingTour
 *
 * Four-step coachmark walkthrough. Auto-starts the first time a new
 * user lands on the populated Dashboard, spotlights one anchor element
 * per step, and floats a popover with the explanation + Back / Next /
 * Skip controls.
 *
 * Dismissal persists in UserPreferences.onboardingDismissed (handled by
 * the caller via `onDismiss`).
 *
 * Accessibility:
 *   - role="dialog" + aria-modal="true" + `inert` on <main> so SR users
 *     hear a context shift AND keyboard focus is actually trapped.
 *   - Focus moves to the primary action button on each step change.
 *   - Esc closes (acts as Skip) from any focus context — but arrow /
 *     Enter shortcuts no-op while focus is inside an editable field, so
 *     the tour can't hijack typing.
 *   - Honours prefers-reduced-motion (no smooth scroll, no ring
 *     transition).
 *
 * No external dependencies (no react-joyride, no focus-trap).
 *
 * Replaces an earlier version that had a ResizeObserver attachment race,
 * no focus trap, an infinite RAF retry on missing targets, mobile
 * selector breakage, and a few smaller correctness/a11y issues. See the
 * commit message for the full review.
 */

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const TOUR_CONFIG = {
  popoverWidth: 320,
  /** Used by the position fallback to decide if the popover fits. */
  popoverHeightEstimate: 220,
  popoverOffset: 12,
  viewportPadding: 8,
  spotlightInflation: 4,
  /** Bail on the step after this many retries (~1 s at 60 fps). */
  maxLocateRetries: 60,
} as const;

type Position = 'top' | 'bottom' | 'left' | 'right';

export type TourStep = {
  id: string;
  /** CSS selector for the anchor. Prefer `data-onboarding="…"` attributes. */
  selector: string;
  title: string;
  /** ReactNode so callers can embed Glossary / kbd / links. */
  body: ReactNode;
  /** Preferred popover side; auto-flips if it doesn't fit. */
  position?: Position;
};

const DEFAULT_STEPS: TourStep[] = [
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
    selector:
      '[data-testid="score-card-accessibility"] [data-filter*="critical"]',
    title: 'Filter by severity',
    body:
      'Click any Critical / Warning / Info tally to narrow the findings list to that slice. Click it again to clear.',
    position: 'bottom',
  },
  {
    id: 'findings',
    selector: '[data-testid="findings-list"]',
    title: 'Findings link to your code',
    body:
      'Click any row to expand the inline fix preview. The arrow on the right opens the file in the Analyzer at the exact line.',
    position: 'top',
  },
  {
    id: 'assistant',
    selector: '[data-onboarding="reports-nav"]',
    title: 'Ask the Assistant',
    body:
      'When you hit something you don\'t understand, head to Reports → Ask assistant and type a question in plain English.',
    position: 'right',
  },
];

type Props = {
  /** Override steps for variant tours; defaults to the 4-step new-user tour. */
  steps?: TourStep[];
  /** Called when the user finishes (Open Assistant) or skips. */
  onDismiss: () => void;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Pure geometry: given the anchor rect, preferred side, and viewport,
 * compute the absolute coords for a `position: fixed` popover. Falls
 * back to the opposite (and then orthogonal) sides if the preferred
 * one would overflow, then clamps so the popover never escapes the
 * viewport padding.
 */
function computePopoverPosition(
  rect: DOMRect,
  preferred: Position,
  vw: number,
  vh: number,
): CSSProperties {
  const {
    popoverWidth: W,
    popoverHeightEstimate: H,
    popoverOffset: O,
    viewportPadding: P,
  } = TOUR_CONFIG;

  const fits: Record<Position, boolean> = {
    bottom: rect.bottom + O + H < vh,
    top: rect.top - O - H > 0,
    right: rect.right + O + W < vw,
    left: rect.left - O - W > 0,
  };

  let actual: Position = preferred;
  if (!fits[actual]) {
    const fallbackOrder: Record<Position, Position[]> = {
      bottom: ['top', 'right', 'left'],
      top: ['bottom', 'right', 'left'],
      right: ['left', 'bottom', 'top'],
      left: ['right', 'bottom', 'top'],
    };
    actual = fallbackOrder[preferred].find((p) => fits[p]) ?? preferred;
  }

  const clampLeft = (x: number) => Math.max(P, Math.min(vw - W - P, x));
  const clampTop = (y: number) => Math.max(P, Math.min(vh - H - P, y));

  switch (actual) {
    case 'bottom':
      return { top: rect.bottom + O, left: clampLeft(rect.left) };
    case 'top':
      return { bottom: vh - rect.top + O, left: clampLeft(rect.left) };
    case 'right':
      return { top: clampTop(rect.top), left: rect.right + O };
    case 'left':
      return { top: clampTop(rect.top), right: vw - rect.left + O };
  }
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function OnboardingTour({ steps = DEFAULT_STEPS, onDismiss }: Props) {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  // Mirror onDismiss into a ref so effects don't churn when the parent
  // passes a fresh closure on every render. Callers don't need to
  // useCallback the dismiss handler — this hides that detail.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const dismiss = useCallback(() => onDismissRef.current(), []);

  const step = steps[stepIdx];

  /* -- Inert the rest of the page so focus is actually trapped --------- */

  useEffect(() => {
    const main = document.querySelector<HTMLElement>('main');
    if (!main) return;
    // `inert` (Baseline 2023+) removes a subtree from focus + interaction
    // in one attribute. Robust and a11y-tree-aware — no manual Tab loop
    // needed. The dialog itself is rendered to <body> via Portal so it
    // sits outside the inert subtree.
    main.setAttribute('inert', '');
    return () => main.removeAttribute('inert');
  }, []);

  /* -- Locate target + track its rect across resize / scroll ---------- */

  useLayoutEffect(() => {
    let cancelled = false;
    let frame = 0;
    let attempts = 0;
    let observed: HTMLElement | null = null;
    const ro = new ResizeObserver(() => {
      if (cancelled || !observed) return;
      setTargetRect(observed.getBoundingClientRect());
    });

    function refresh() {
      if (cancelled || !observed) return;
      setTargetRect(observed.getBoundingClientRect());
    }

    function locate() {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(step.selector);
      // offsetParent === null catches display:none and hidden ancestors —
      // important for the mobile sidebar (collapsed off-screen), which
      // would otherwise position the spotlight at the page edge with
      // nothing visible underneath.
      const visible = el && el.offsetParent !== null;
      if (!visible) {
        if (attempts++ > TOUR_CONFIG.maxLocateRetries) {
          // Target never showed up — quietly close instead of busy-looping.
          dismiss();
          return;
        }
        frame = requestAnimationFrame(locate);
        return;
      }
      el!.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'center',
        inline: 'center',
      });
      observed = el!;
      ro.observe(el!);
      setTargetRect(el!.getBoundingClientRect());
    }
    locate();

    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
      ro.disconnect();
    };
  }, [step.selector, dismiss]);

  /* -- Focus the primary action on every step change ------------------- */

  useEffect(() => {
    // Small timeout so it runs after the popover repaints in its new
    // position (focus moves the viewport otherwise on some browsers).
    const t = setTimeout(() => nextButtonRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [stepIdx]);

  /* -- Keyboard ------------------------------------------------------- */

  const advance = useCallback(() => {
    if (stepIdx < steps.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      // Final step nudges to the Assistant — accepting also navigates
      // there as a friendly hand-off.
      navigate('/reports');
      dismiss();
    }
  }, [stepIdx, steps.length, navigate, dismiss]);

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      // Escape always works — universal "get me out" affordance.
      if (ev.key === 'Escape') {
        ev.preventDefault();
        dismiss();
        return;
      }
      // Don't hijack arrows / Enter while the user is typing in an input.
      if (isEditableTarget(ev.target)) return;
      if (ev.key === 'ArrowRight' || ev.key === 'Enter') {
        ev.preventDefault();
        advance();
      } else if (ev.key === 'ArrowLeft' && stepIdx > 0) {
        ev.preventDefault();
        setStepIdx((i) => i - 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepIdx, advance, dismiss]);

  /* -- Render --------------------------------------------------------- */

  const popoverStyle = useMemo<CSSProperties>(() => {
    if (!targetRect) return {};
    return computePopoverPosition(
      targetRect,
      step.position ?? 'bottom',
      window.innerWidth,
      window.innerHeight,
    );
  }, [targetRect, step.position]);

  if (!targetRect) return null;

  const isFirst = stepIdx === 0;
  const isLast = stepIdx === steps.length - 1;
  const reduceMotion = prefersReducedMotion();
  const titleId = 'onboarding-tour-title';
  const bodyId = 'onboarding-tour-body';
  const inflate = TOUR_CONFIG.spotlightInflation;

  return createPortal(
    <>
      {/* Spotlight ring around the target. pointer-events-none so the
          user can click through to the spotlighted control. */}
      <div
        aria-hidden
        data-testid="onboarding-spotlight"
        className={[
          'pointer-events-none fixed z-40 rounded-lg ring-4 ring-brand-500 ring-offset-2 shadow-2xl',
          'ring-offset-white dark:ring-offset-slate-950',
          reduceMotion ? '' : 'transition-all duration-200',
        ].join(' ')}
        style={{
          top: targetRect.top - inflate,
          left: targetRect.left - inflate,
          width: targetRect.width + inflate * 2,
          height: targetRect.height + inflate * 2,
        }}
      />
      {/* Popover */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        data-testid="onboarding-tour"
        data-step={step.id}
        className="card fixed z-50 w-80 p-4 shadow-xl"
        style={popoverStyle}
      >
        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          <span aria-current="step">
            Step {stepIdx + 1} of {steps.length}
          </span>
          <button
            type="button"
            onClick={dismiss}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close tour"
            data-testid="onboarding-close"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>
        <h3
          id={titleId}
          className="text-sm font-semibold text-slate-900 dark:text-slate-100"
        >
          {step.title}
        </h3>
        <div
          id={bodyId}
          className="mt-1 text-xs text-slate-700 dark:text-slate-300"
        >
          {step.body}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={dismiss}
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
              ref={nextButtonRef}
              type="button"
              onClick={advance}
              className="btn-primary text-xs"
              data-testid="onboarding-next"
            >
              {isLast ? 'Open Assistant' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
