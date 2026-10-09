import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Moon, Plus, Sun, Trash2 } from "lucide-react";
import RestTimer from "../components/RestTimer";
import { useTheme } from "../lib/theme";
import { selectionFeedback } from "../lib/native";
import logoUrl from "../assets/logo.png";

type Item = { id: string; name: string; done: boolean };

export default function Explore() {
  const { resolvedTheme, setThemeMode } = useTheme();
  const [name, setName] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  return (
    <main className="guest-workout mx-auto max-w-2xl px-5 pb-12">
      <header className="flex items-center justify-between gap-4 py-5">
        <div className="flex items-center gap-2">
          <img className="theme-logo-adaptive h-9 w-9" src={logoUrl} alt="" />
          <h1 className="text-2xl font-bold">Vincere</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="app-icon-button"
            aria-label={
              resolvedTheme === "dark" ? "Activer le thème clair" : "Activer le thème sombre"
            }
            onClick={() => setThemeMode(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <Link to="/sign-in" className="text-sm font-semibold py-3">
            Connexion
          </Link>
        </div>
      </header>
      <section className="py-6 border-t border-gray-200">
        <h2 className="text-2xl font-bold">Ma séance libre</h2>
        <p className="mt-2 text-sm text-gray-500">Sans compte · Séance non enregistrée</p>
        <form
          className="mt-5 flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || items.length >= 40) return;
            setItems([...items, { id: crypto.randomUUID(), name: name.trim(), done: false }]);
            setName("");
          }}
        >
          <div className="min-w-0 flex-1">
            <label className="mb-2 block text-sm font-semibold" htmlFor="guest-exercise">
              Exercice
            </label>
            <input
              id="guest-exercise"
              className="app-input"
              value={name}
              maxLength={120}
              placeholder="Ex. Squats, 3 × 10"
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="app-icon-button"
            aria-label="Ajouter l'exercice"
            disabled={!name.trim() || items.length >= 40}
          >
            <Plus size={22} />
          </button>
        </form>
        <ul className="mt-4 divide-y divide-gray-200">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <button
                className="app-icon-button shrink-0"
                aria-label={`${item.done ? "Reprendre" : "Terminer"} : ${item.name}`}
                aria-pressed={item.done}
                onClick={() => {
                  setItems(
                    items.map((entry) =>
                      entry.id === item.id ? { ...entry, done: !entry.done } : entry,
                    ),
                  );
                  void selectionFeedback();
                }}
              >
                <Check size={18} className={item.done ? "text-emerald-600" : "text-gray-400"} />
              </button>
              <span
                className={`min-w-0 flex-1 break-words text-sm ${item.done ? "line-through text-gray-500" : ""}`}
              >
                {item.name}
              </span>
              <button
                className="app-icon-button shrink-0"
                aria-label={`Supprimer : ${item.name}`}
                onClick={() => setItems(items.filter((entry) => entry.id !== item.id))}
              >
                <Trash2 size={17} />
              </button>
            </li>
          ))}
        </ul>
        {items.length > 0 && (
          <p className="mt-3 text-sm text-gray-500" role="status">
            {items.filter((item) => item.done).length} / {items.length} exercices terminés
          </p>
        )}
      </section>
      <RestTimer />
      <section className="mt-8 border-t border-gray-200 pt-6">
        <Link to="/sign-up?next=%2Fonboarding" className="app-primary w-full">
          Créer mon programme personnalisé
        </Link>
        <p className="mt-4 text-xs leading-relaxed text-gray-500">
          Adapte l'effort à tes capacités. Arrête en cas de douleur et consulte un professionnel en
          cas de doute.
        </p>
      </section>
      <nav className="mt-6 flex flex-wrap gap-5 text-xs underline" aria-label="Informations">
        <Link to="/privacy">Confidentialité</Link>
        <Link to="/terms">Conditions</Link>
        <Link to="/support">Assistance</Link>
      </nav>
    </main>
  );
}
