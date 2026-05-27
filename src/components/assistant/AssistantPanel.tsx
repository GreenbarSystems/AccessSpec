import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditReport } from '../../services/AuditCache';
import {
  ask,
  SUGGESTED_PROMPTS,
  type AssistantReply,
} from '../../services/AssistantEngine';
import type { Severity } from '../../services/RuleEngine';

const SEVERITY_TONE: Record<Severity, string> = {
  critical: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
};

type Turn = { role: 'user' | 'assistant'; content: string; reply?: AssistantReply };

export function AssistantPanel() {
  const navigate = useNavigate();
  const report = useAuditReport();
  const findings = report?.findings ?? [];

  const [conversation, setConversation] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const scrollerRef = useRef<HTMLDivElement>(null);

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    const reply = ask(q, findings);
    setConversation((prev) => [
      ...prev,
      { role: 'user', content: q },
      { role: 'assistant', content: q, reply },
    ]);
    setDraft('');
    // Scroll the conversation to the bottom after the new turn lands.
    requestAnimationFrame(() => {
      if (scrollerRef.current) {
        scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
      }
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  return (
    <div className="space-y-3" data-testid="assistant-panel">
      <div className="card p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Suggested prompts
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => send(p)}
              data-suggested={p}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:bg-slate-900 dark:border-slate-800"
            >
              {p}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          The assistant matches your question against the {report ? findings.length : 0}{' '}
          finding{findings.length === 1 ? '' : 's'} in the current audit and
          our 17-rule database. Every answer cites the matched rule ID, so you
          can verify it in the Inspector.
        </p>
      </div>

      {/* Conversation */}
      <div
        ref={scrollerRef}
        className="card max-h-[60vh] min-h-[12rem] space-y-3 overflow-auto p-3"
        data-testid="assistant-conversation"
      >
        {conversation.length === 0 ? (
          <p className="text-center text-sm text-slate-500">
            Ask a question or pick a suggested prompt above.
          </p>
        ) : (
          conversation.map((turn, i) =>
            turn.role === 'user' ? (
              <UserBubble key={i} text={turn.content} />
            ) : (
              <AssistantBubble
                key={i}
                reply={turn.reply!}
                onJump={(file, line) =>
                  navigate('/analyzer', { state: { jump: { path: file, line } } })
                }
              />
            ),
          )
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={onSubmit}
        className="card flex gap-2 p-2"
        data-testid="assistant-form"
      >
        <input
          aria-label="Ask the assistant"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder='e.g. "Why is my modal failing accessibility?"'
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700"
          data-testid="assistant-input"
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={!draft.trim()}
          data-testid="assistant-send"
        >
          Ask
        </button>
      </form>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end" data-role="user">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand-600 px-3 py-2 text-sm text-white">
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({
  reply,
  onJump,
}: {
  reply: AssistantReply;
  onJump: (file: string, line: number) => void;
}) {
  return (
    <article
      className="rounded-2xl rounded-tl-sm bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-900"
      data-role="assistant"
      data-rule={reply.matchedRule?.id ?? ''}
      data-confidence={reply.confidence}
    >
      {/* Matched rule pill (or "no match") */}
      <header className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
        {reply.matchedRule ? (
          <>
            <span
              className={`rounded px-1.5 py-0.5 font-semibold uppercase ${SEVERITY_TONE[reply.matchedRule.severity]}`}
            >
              {reply.matchedRule.severity}
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {reply.matchedRule.id}
            </span>
            <span className="text-slate-500">
              · confidence {Math.round(reply.confidence * 100)}%
            </span>
          </>
        ) : (
          <span className="text-slate-500">No matching rule.</span>
        )}
      </header>

      {/* Explanation */}
      <Section title="Explanation" testId="ans-explanation">
        <Markdown text={reply.explanation} />
      </Section>

      {/* Code fix */}
      {reply.codeFix && (
        <Section title="Code fix" testId="ans-code">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {reply.codeFix.bad && (
              <CodeBlock tone="rose" label="Don't" code={reply.codeFix.bad} language={reply.codeFix.language} />
            )}
            <CodeBlock tone="emerald" label="Do" code={reply.codeFix.good} language={reply.codeFix.language} />
          </div>
        </Section>
      )}

      {/* Best practice */}
      {reply.bestPractice.length > 0 && (
        <Section title="Best practice" testId="ans-best">
          <ul className="list-inside list-disc text-xs text-slate-700 dark:text-slate-300">
            {reply.bestPractice.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* References + affected */}
      {(reply.references.length > 0 || reply.affectedElements.length > 0) && (
        <footer className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-200 pt-2 text-[11px] text-slate-600 dark:text-slate-400 sm:grid-cols-2 dark:border-slate-800">
          {reply.references.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                References
              </div>
              <ul className="mt-0.5 font-mono">
                {reply.references.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {reply.affectedElements.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Affected in your project
              </div>
              <ul className="mt-0.5 space-y-0.5">
                {reply.affectedElements.map((el, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => onJump(el.file, el.line)}
                      data-jump={`${el.file}:${el.line}`}
                      className="font-mono text-brand-700 hover:underline"
                    >
                      {el.file}:{el.line} · &lt;{el.tag}&gt;
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </footer>
      )}
    </article>
  );
}

function Section({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-2 last:mb-0" data-testid={testId}>
      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Minimal markdown renderer — only **bold** and paragraph breaks. Enough for
 * the assistant's templated replies; nothing user-supplied is fed through.
 */
function Markdown({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/);
  return (
    <div className="space-y-2 text-sm text-slate-800 dark:text-slate-200">
      {paragraphs.map((p, i) => (
        <p
          key={i}
          dangerouslySetInnerHTML={{
            __html: p
              .replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
              .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'),
          }}
        />
      ))}
    </div>
  );
}

function CodeBlock({
  tone,
  label,
  code,
  language,
}: {
  tone: 'rose' | 'emerald';
  label: string;
  code: string;
  language?: string;
}) {
  const toneClass =
    tone === 'rose'
      ? 'border-rose-200 bg-rose-50'
      : 'border-emerald-200 bg-emerald-50';
  const labelClass = tone === 'rose' ? 'text-rose-700' : 'text-emerald-700';
  return (
    <div className={`overflow-hidden rounded border ${toneClass}`}>
      <div
        className={`flex items-center justify-between border-b border-current/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${labelClass}`}
      >
        <span>{label}</span>
        {language && <span className="opacity-60">{language}</span>}
      </div>
      <pre className="overflow-auto p-2 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200">
        {code}
      </pre>
    </div>
  );
}
