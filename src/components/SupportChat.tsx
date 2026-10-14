import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { chatWithSupport } from "../lib/openai";

type Message = { id: string; role: "user" | "assistant"; content: string };

let msgCounter = 0;
function newMsg(role: Message["role"], content: string): Message {
  msgCounter += 1;
  return { id: `${role}-${msgCounter}`, role, content };
}

const INITIAL: Message[] = [
  newMsg("assistant", "Bonjour ! Comment puis-je t'aider avec ton programme ou tes séances ?"),
];

const SUGGESTION_POOL = [
  "Comment créer un programme ?",
  "Quels sports sont disponibles ?",
  "Combien de temps dure la génération ?",
  "Où retrouver mon programme ?",
  "Comment adapter l'intensité ?",
  "C'est quoi HYROX ?",
  "Comment suivre mes séances ?",
  "Puis-je modifier mon programme ?",
  "Comment supprimer mon compte ?",
];

function pickSuggestions(exclude: string[], count = 3): string[] {
  const pool = SUGGESTION_POOL.filter((s) => !exclude.includes(s));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Détecte le clavier à l'écran : le viewport visuel rétrécit (Safari), ou l'app native pose
 * data-keyboard. Sert à libérer de la place pour les messages pendant la saisie.
 */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const shrunk = viewport ? window.innerHeight - viewport.height > 120 : false;
      setOpen(shrunk || root.dataset.keyboard === "open");
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    viewport?.addEventListener("resize", schedule);
    const observer = new MutationObserver(schedule);
    observer.observe(root, { attributes: true, attributeFilter: ["data-keyboard"] });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);
  return open;
}

export default function SupportChat({ onContact }: Readonly<{ onContact: () => void }>) {
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usedSuggestions, setUsedSuggestions] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>(() => pickSuggestions([]));
  const bottomRef = useRef<HTMLDivElement>(null);
  const keyboardOpen = useKeyboardOpen();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bottomRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }, [messages, loading]);

  // Le clavier s'ouvre ou se ferme : on recolle la conversation en bas, sans animation (pas de saut).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [keyboardOpen]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    // track used suggestions and refresh pool
    if (text) {
      const nextUsed = [...usedSuggestions, text];
      setUsedSuggestions(nextUsed);
      setSuggestions(pickSuggestions(nextUsed));
    }
    const userMsg = newMsg("user", content);
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    try {
      const reply = await chatWithSupport(
        history.map((m) => ({ role: m.role, content: m.content })),
      );
      setMessages([...history, newMsg("assistant", reply)]);
    } catch (err) {
      setMessages([
        ...history,
        newMsg(
          "assistant",
          err instanceof Error
            ? err.message
            : "La demande n'a pas abouti. Réessaie dans un instant.",
        ),
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Messages : seule zone qui défile */}
      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3"
        role="log"
        aria-live="polite"
        aria-label="Conversation avec l'assistant"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && (
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
                aria-hidden="true"
              >
                <Sparkles size={14} />
              </div>
            )}
            <div
              className={`max-w-[82%] whitespace-pre-wrap px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "rounded-2xl rounded-br-sm bg-ink font-medium text-paper"
                  : "rounded-2xl rounded-bl-sm bg-card-soft text-ink"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-end gap-2" role="status" aria-label="L'assistant écrit">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
              aria-hidden="true"
            >
              <Sparkles size={14} />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-card-soft px-4 py-3">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Pied fixe : suggestions, contact humain, saisie */}
      <div
        className="shrink-0 border-t border-line bg-card"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {!loading && !keyboardOpen && (
          <div
            className="flex gap-2 overflow-x-auto px-4 pt-2"
            role="group"
            aria-label="Questions suggérées"
          >
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                className="min-h-11 shrink-0 rounded-full border border-line-strong bg-card-muted px-4 text-xs font-semibold text-ink transition-colors hover:bg-card-soft"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 px-4 pt-2">
          <label htmlFor="support-chat-input" className="sr-only">
            Ta question
          </label>
          <input
            id="support-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void send()}
            placeholder="Pose ta question…"
            enterKeyHint="send"
            className="app-input min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim() || loading}
            aria-label="Envoyer la question"
            className="app-primary h-12 w-12 shrink-0 p-0!"
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </div>
        {!keyboardOpen && (
          <button
            type="button"
            onClick={onContact}
            className="mx-auto mt-1 flex min-h-11 items-center px-4 text-xs font-semibold text-ink-soft underline underline-offset-2"
          >
            Une question pour l'équipe ? Contacter l'assistance
          </button>
        )}
      </div>
    </div>
  );
}
