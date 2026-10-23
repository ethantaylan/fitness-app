import { Link, useLocation } from "react-router-dom";
import { FREE_SESSION_BUILDER_ENABLED } from "../lib/features";
import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { ArrowRight, Sparkles } from "lucide-react";
import Modal from "./ui/Modal";
import logoUrl from "../assets/logo.png";
import { saveContactMessage } from "../lib/db";
import { supabase } from "../lib/supabase";
import BetaBadge from "./BetaBadge";
import ThemeToggleButton from "./ThemeToggleButton";

const CONTACT_SUBJECTS = [
  { value: "programme", label: "Question sur mon programme" },
  { value: "compte", label: "Problème de compte" },
  { value: "partenariat", label: "Partenariat" },
  { value: "autre", label: "Autre" },
] as const;

type ContactFormState = {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
};

export default function Navbar() {
  const { isSignedIn, user, userEmail, userFirstName } = useAuth();
  const location = useLocation();
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState("");
  const fullName = (
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    ""
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const inferredLastName = fullName.slice(1).join(" ");
  function makeDefaultContactForm(): ContactFormState {
    return {
      firstName: userFirstName ?? "",
      lastName: inferredLastName,
      email: userEmail ?? "",
      subject: "",
      message: "",
    };
  }
  const [contactForm, setContactForm] = useState<ContactFormState>(() => makeDefaultContactForm());

  useEffect(() => {
    function handleOpen() {
      setContactError("");
      setContactSent(false);
      setContactOpen(true);
    }
    globalThis.addEventListener("open-contact", handleOpen);
    return () => globalThis.removeEventListener("open-contact", handleOpen);
  }, []);

  useEffect(() => {
    setContactForm((current) => ({
      ...current,
      firstName: current.firstName || userFirstName || "",
      lastName: current.lastName || inferredLastName || "",
      email: current.email || userEmail || "",
    }));
  }, [inferredLastName, userEmail, userFirstName]);

  function closeContact() {
    if (contactSubmitting) return;
    setContactOpen(false);
  }

  function updateContactField(field: keyof ContactFormState, value: string) {
    setContactError("");
    setContactForm((current) => ({ ...current, [field]: value }));
  }

  async function handleContactSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (contactSubmitting) return;

    setContactSubmitting(true);
    setContactError("");

    try {
      const subject =
        CONTACT_SUBJECTS.find((option) => option.value === contactForm.subject)?.label ??
        contactForm.subject;

      await saveContactMessage(supabase, {
        userId: user?.id ?? null,
        firstName: contactForm.firstName.trim(),
        lastName: contactForm.lastName.trim() || null,
        email: contactForm.email.trim().toLowerCase(),
        subject,
        message: contactForm.message.trim(),
      });

      setContactForm(makeDefaultContactForm());
      setContactSent(true);
    } catch (error) {
      console.warn(error);
      setContactError(
        "Impossible d'envoyer le message pour le moment. Réessaie dans quelques instants.",
      );
    } finally {
      setContactSubmitting(false);
    }
  }

  return (
    <>
      <nav className="app-top-nav fixed inset-x-0 top-0 z-50 border-b border-line bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          {/* Logo */}
          <Link to="/" className="flex min-h-11 items-center gap-2.5 shrink-0">
            <img src={logoUrl} alt="" className="theme-logo-adaptive h-7 w-7" />
            <span className="text-sm font-black">Vincere</span>
            <BetaBadge compact />
          </Link>

          {!isSignedIn && (
            <div className="hidden items-center gap-1 lg:flex">
              {[
                ["Fonctionnement", "#fonctionnement"],
                ["Fonctionnalités", "#fonctionnalites"],
                ["Tarifs", "#tarifs"],
                ["FAQ", "#faq"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold text-ink-soft transition-colors hover:bg-card-soft hover:text-ink"
                >
                  {label}
                </a>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2">
            {isSignedIn ? (
              <>
                {/* Desktop : navigation complète */}
                <div className="hidden items-center gap-1 md:flex">
                  {[
                    { label: "Accueil", path: "/dashboard" },
                    { label: "Programme", path: "/result" },
                    // Onglet « Séances » masqué avec le builder (voir src/lib/features.ts).
                    ...(FREE_SESSION_BUILDER_ENABLED
                      ? [{ label: "Séances", path: "/session" }]
                      : []),
                    { label: "Suivi", path: "/records" },
                    { label: "Profil", path: "/settings" },
                  ].map(({ label, path }) => {
                    const active =
                      location.pathname === path ||
                      (path === "/session" && location.pathname === "/builder");
                    return (
                      <Link
                        key={path}
                        to={path}
                        aria-current={active ? "page" : undefined}
                        className={`inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-bold transition-colors ${
                          active
                            ? "bg-card-soft text-ink underline decoration-brand decoration-2 underline-offset-8"
                            : "text-ink-soft hover:bg-card-soft hover:text-ink"
                        }`}
                      >
                        {label}
                      </Link>
                    );
                  })}
                  <div className="mx-1 h-4 w-px bg-line-strong" aria-hidden="true" />
                </div>
                {/* Mobile : l'assistant est dans la barre du bas ; ce bouton ne sert qu'au bureau. */}
                <button
                  type="button"
                  aria-label="Ouvrir l'assistant"
                  aria-haspopup="dialog"
                  title="Assistant Vincere"
                  onClick={(event) => {
                    event.currentTarget.focus();
                    globalThis.dispatchEvent(new Event("open-Vincere-chat"));
                  }}
                  className="hidden h-11 w-11 items-center justify-center rounded-full border border-line bg-card-soft text-ink transition-colors hover:bg-card-strong md:inline-flex"
                >
                  <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>
                {/* Le thème se change depuis Profil : plus de bouton dans l'en-tête connecté. */}
              </>
            ) : (
              <>
                <ThemeToggleButton />
                <Link
                  to="/sign-in"
                  className="hidden min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-card-soft hover:text-ink sm:inline-flex"
                >
                  Connexion
                </Link>
                <Link
                  to="/sign-up?next=%2Fonboarding"
                  className="inline-flex min-h-11 items-center rounded-xl bg-black px-4 text-sm font-bold text-white transition-colors hover:bg-gray-800"
                >
                  Commencer
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <Modal open={contactOpen} title="Contacter l'assistance" onClose={closeContact}>
        {contactSent ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-2xl text-brand">
              <span aria-hidden="true">✓</span>
            </div>
            <h3 className="mb-1 text-lg font-black">Message envoyé !</h3>
            <p className="text-sm text-ink-soft">On te répond très bientôt par e-mail.</p>
            <button
              type="button"
              onClick={() => {
                setContactError("");
                setContactSent(false);
                setContactForm(makeDefaultContactForm());
              }}
              className="app-secondary mt-6"
            >
              Envoyer un autre message
            </button>
          </div>
        ) : (
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="c-name" className="mb-1.5 block text-sm font-semibold">
                  Prénom
                </label>
                <input
                  id="c-name"
                  type="text"
                  value={contactForm.firstName}
                  onChange={(e) => updateContactField("firstName", e.target.value)}
                  disabled={contactSubmitting}
                  required
                  placeholder="Alex"
                  className="app-input"
                />
              </div>
              <div>
                <label htmlFor="c-lastname" className="mb-1.5 block text-sm font-semibold">
                  Nom
                </label>
                <input
                  id="c-lastname"
                  type="text"
                  value={contactForm.lastName}
                  onChange={(e) => updateContactField("lastName", e.target.value)}
                  disabled={contactSubmitting}
                  placeholder="Dupont"
                  className="app-input"
                />
              </div>
            </div>
            <div>
              <label htmlFor="c-email" className="mb-1.5 block text-sm font-semibold">
                E-mail
              </label>
              <input
                id="c-email"
                type="email"
                value={contactForm.email}
                onChange={(e) => updateContactField("email", e.target.value)}
                disabled={contactSubmitting}
                required
                placeholder="alex@email.com"
                className="app-input"
              />
            </div>
            <div>
              <label htmlFor="c-subject" className="mb-1.5 block text-sm font-semibold">
                Sujet
              </label>
              <select
                id="c-subject"
                value={contactForm.subject}
                onChange={(e) => updateContactField("subject", e.target.value)}
                disabled={contactSubmitting}
                required
                className="app-input"
              >
                <option value="">Sélectionner…</option>
                {CONTACT_SUBJECTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="c-message" className="mb-1.5 block text-sm font-semibold">
                Message
              </label>
              <textarea
                id="c-message"
                rows={4}
                value={contactForm.message}
                onChange={(e) => updateContactField("message", e.target.value)}
                disabled={contactSubmitting}
                required
                placeholder="Décris-nous ta demande…"
                className="app-input resize-none"
              />
            </div>
            {contactError && (
              <p role="alert" className="text-sm font-medium text-danger">
                {contactError}
              </p>
            )}
            <button
              type="submit"
              disabled={
                contactSubmitting ||
                !contactForm.firstName.trim() ||
                !contactForm.email.trim() ||
                !contactForm.subject ||
                !contactForm.message.trim()
              }
              className="app-primary w-full"
            >
              {contactSubmitting ? "Envoi en cours…" : "Envoyer le message"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
