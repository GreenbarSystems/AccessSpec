import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * ToastHost
 *
 * Minimal, dep-free global toast system. Wraps the app in a Context that
 * exposes `useToast()` for any descendant to call:
 *
 *   const toast = useToast();
 *   toast.success('Uploaded 5 files');
 *   toast.error('Import failed: rate limit');
 *
 * Each toast auto-dismisses after `durationMs` (default 4s). The host
 * stacks them top-right and renders them in an `aria-live="polite"` region
 * so screen-reader users hear the same feedback.
 *
 * No animation framework: a CSS transition on opacity + transform is
 * enough for the slide-in. No external state — purely React.
 */

export type ToastTone = 'success' | 'error' | 'info';

export type ToastMessage = {
  id: number;
  tone: ToastTone;
  text: string;
  durationMs: number;
};

type ToastApi = {
  show: (text: string, tone?: ToastTone, durationMs?: number) => void;
  success: (text: string, durationMs?: number) => void;
  error: (text: string, durationMs?: number) => void;
  info: (text: string, durationMs?: number) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TONE_STYLE: Record<ToastTone, { ring: string; icon: string; iconClass: string }> = {
  success: {
    ring: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: '✓',
    iconClass: 'bg-emerald-500 text-white',
  },
  error: {
    ring: 'border-rose-200 bg-rose-50 text-rose-900',
    icon: '✗',
    iconClass: 'bg-rose-500 text-white',
  },
  info: {
    ring: 'border-sky-200 bg-sky-50 text-sky-900',
    icon: 'i',
    iconClass: 'bg-sky-500 text-white',
  },
};

export function ToastHost({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  // Track timers so dismissing early cleans up cleanly.
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (text: string, tone: ToastTone = 'info', durationMs = 4000) => {
      const id = nextId.current++;
      const toast: ToastMessage = { id, tone, text, durationMs };
      setToasts((prev) => [...prev, toast]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), durationMs),
      );
    },
    [dismiss],
  );

  // Clear all pending timers on unmount.
  useEffect(() => {
    const timersMap = timers.current;
    return () => {
      for (const t of timersMap.values()) clearTimeout(t);
      timersMap.clear();
    };
  }, []);

  const api: ToastApi = {
    show,
    success: (text, durationMs) => show(text, 'success', durationMs),
    error: (text, durationMs) => show(text, 'error', durationMs ?? 6000),
    info: (text, durationMs) => show(text, 'info', durationMs),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed right-4 top-4 z-50 flex max-w-[24rem] flex-col gap-2"
        data-testid="toast-host"
      >
        {toasts.map((t) => {
          const style = TONE_STYLE[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              data-toast={t.tone}
              data-toast-id={t.id}
              className={[
                'pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-md',
                style.ring,
                'animate-in fade-in slide-in-from-top-2',
              ].join(' ')}
            >
              <span
                aria-hidden
                className={[
                  'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  style.iconClass,
                ].join(' ')}
              >
                {style.icon}
              </span>
              <span className="flex-1">{t.text}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="-mr-1 ml-1 rounded p-0.5 text-current/70 hover:bg-black/5 hover:text-current"
              >
                <span aria-hidden>✕</span>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be called inside <ToastHost>');
  }
  return ctx;
}
