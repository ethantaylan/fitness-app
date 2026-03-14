import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { chatWithSupport } from "../lib/openai";

type Message = { id: string; role: "user" | "assistant"; content: string };

let msgCounter = 0;
function newMsg(role: Message["role"], content: string): Message {
  msgCounter += 1;
  return { id: `${role}-${msgCounter}`, role, content };
}

const INITIAL: Message[] = [
  newMsg(
    "assistant",
    "Salut ! Je suis l'assistant SportAI 👋\nProgramme, sport, abonnement… pose-moi n'importe quelle question !",
  ),
];

const SUGGESTION_POOL = [
  "Comment créer un programme ?",
  "Quels sports sont disponibles ?",
  "C'est quoi le plan Premium ?",
  "Combien de temps dure la génération ?",
  "Peut-on exporter en PDF ?",
  "Comment adapter l'intensité ?",
  "C'est quoi HYROX ?",
  "Comment suivre mes séances ?",
  "Puis-je modifier mon programme ?",
  "Combien coûte l'abonnement ?",
];

function pickSuggestions(exclude: string[], count = 3): string[] {
  const pool = SUGGESTION_POOL.filter((s) => !exclude.includes(s));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function SupportChat() {
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usedSuggestions, setUsedSuggestions] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>(() => pickSuggestions([]));
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
    } catch {
      setMessages([
        ...history,
        newMsg("assistant", "Oups, une erreur est survenue. Réessaie dans un instant !"),
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && (
              <div className="w-6 h-6 rounded-lg bg-white/10 border border-white/8 flex items-center justify-center shrink-0 text-[11px] select-none">
                ⚡
              </div>
            )}
            <div
              className={`max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-white text-black rounded-2xl rounded-br-sm font-medium"
                  : "bg-white/10 text-gray-200 rounded-2xl rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-6 h-6 rounded-lg bg-white/10 border border-white/8 flex items-center justify-center shrink-0 text-[11px] select-none">
              ⚡
            </div>
            <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions — toujours visibles, se renouvellent après chaque envoi */}
      {!loading && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-[11px] font-medium bg-white/8 border border-white/10 text-gray-300 rounded-full px-3 py-1.5 hover:bg-white/15 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 shrink-0">
        <div className="flex items-center gap-2 bg-white/8 border border-white/12 rounded-2xl px-4 py-2.5 focus-within:border-white/25 transition-colors">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Pose ta question…"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none min-w-0"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-7 h-7 bg-white rounded-xl flex items-center justify-center hover:bg-gray-100 disabled:opacity-25 transition-all shrink-0"
          >
            <Send className="w-3 h-3 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
}
