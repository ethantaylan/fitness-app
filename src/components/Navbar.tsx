import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { Mail, X, ArrowRight, LogOut } from "lucide-react";
import logoUrl from "../assets/logo.png";
export default function Navbar() {
  const { isSignedIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  useEffect(() => {
    function handleOpen() {
      setContactOpen(true);
    }
    globalThis.addEventListener("open-contact", handleOpen);
    return () => globalThis.removeEventListener("open-contact", handleOpen);
  }, []);

  return (
    <>
      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={logoUrl} alt="Vincere" className="w-7 h-7 rounded-lg" />
            <span className="font-black text-sm tracking-tight">Vincere</span>
          </Link>

          {/* Right */}
          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <>
                {/* Mobile: contact + logout */}
                <button
                  aria-label="Contact"
                  onClick={() => setContactOpen(true)}
                  className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                </button>
                <button
                  aria-label="Se déconnecter"
                  onClick={() => void signOut().then(() => navigate("/"))}
                  className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
                {/* Desktop: nav complète */}
                <div className="hidden md:flex items-center gap-2">
                  <Link
                    to="/dashboard"
                    className="text-sm font-medium text-gray-500 hover:text-black px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Accueil
                  </Link>
                  <Link
                    to="/result"
                    className="text-sm font-medium text-gray-500 hover:text-black px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Programme
                  </Link>
                  <Link
                    to="/records"
                    className="text-sm font-medium text-gray-500 hover:text-black px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Suivi
                  </Link>
                  <Link
                    to="/settings"
                    className="text-sm font-medium text-gray-500 hover:text-black px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Profil
                  </Link>
                  <div className="w-px h-4 bg-gray-200 mx-1" />
                  <button
                    aria-label="Contact"
                    onClick={() => setContactOpen(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                  <button
                    aria-label="Se déconnecter"
                    onClick={() => void signOut().then(() => navigate("/"))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  className="hidden md:inline-flex text-sm font-medium text-gray-500 hover:text-black px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  to="/onboarding"
                  className="text-sm font-bold bg-black text-white px-4 py-1.5 rounded-full hover:bg-gray-800 transition-colors"
                >
                  Commencer
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Contact drawer ── */}
      <div
        className={`fixed inset-0 z-60 flex justify-end transition-opacity duration-300 ${
          contactOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setContactOpen(false)}
        />

        {/* Panel */}
        <div
          className={`relative w-full max-w-md bg-[#0e0e0e] text-white flex flex-col overflow-y-auto transition-transform duration-300 ${
            contactOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#0e0e0e]/90 backdrop-blur-md px-6 pt-6 pb-4 border-b border-white/5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black">Contactez-nous</h2>
              </div>
              <button
                onClick={() => setContactOpen(false)}
                className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-colors shrink-0 mt-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 px-6 py-6">
            {contactSent ? (
              /* Success state */
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">✓</span>
                </div>
                <h3 className="font-black text-lg mb-1">Message envoyé !</h3>
                <p className="text-sm text-gray-500">On vous recontacte très bientôt.</p>
                <button
                  onClick={() => setContactSent(false)}
                  className="mt-6 text-xs text-gray-500 underline hover:text-white transition-colors"
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              /* Form */
              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="c-name"
                      className="text-[11px] font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide"
                    >
                      Prénom
                    </label>
                    <input
                      id="c-name"
                      type="text"
                      placeholder="Alex"
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/25 focus:bg-white/8 transition-all"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="c-lastname"
                      className="text-[11px] font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide"
                    >
                      Nom
                    </label>
                    <input
                      id="c-lastname"
                      type="text"
                      placeholder="Dupont"
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/25 focus:bg-white/8 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="c-email"
                    className="text-[11px] font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide"
                  >
                    Email
                  </label>
                  <input
                    id="c-email"
                    type="email"
                    placeholder="alex@email.com"
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/25 focus:bg-white/8 transition-all"
                  />
                </div>
                <div>
                  <label
                    htmlFor="c-subject"
                    className="text-[11px] font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide"
                  >
                    Sujet
                  </label>
                  <select
                    id="c-subject"
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-gray-400 focus:outline-none focus:border-white/25 transition-all appearance-none"
                  >
                    <option value="" className="bg-[#111]">
                      Sélectionner...
                    </option>
                    <option value="programme" className="bg-[#111]">
                      Question sur mon programme
                    </option>
                    <option value="compte" className="bg-[#111]">
                      Problème de compte
                    </option>
                    <option value="partenariat" className="bg-[#111]">
                      Partenariat
                    </option>
                    <option value="autre" className="bg-[#111]">
                      Autre
                    </option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="c-message"
                    className="text-[11px] font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide"
                  >
                    Message
                  </label>
                  <textarea
                    id="c-message"
                    rows={4}
                    placeholder="Décris-nous ta demande..."
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/25 focus:bg-white/8 transition-all resize-none"
                  />
                </div>
                <button
                  onClick={() => setContactSent(true)}
                  className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-100 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2"
                >
                  Envoyer le message
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                Rejoignez-nous
              </span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* Social links */}
            <div className="space-y-2">
              {[
                {
                  label: "Instagram",
                  handle: "@Vincere_app",
                  grad: "from-fuchsia-500 via-pink-500 to-orange-400",
                  letter: "IG",
                },
                {
                  label: "LinkedIn",
                  handle: "Vincere",
                  grad: "from-blue-700 to-blue-500",
                  letter: "in",
                },
                {
                  label: "Twitter / X",
                  handle: "@Vincere_app",
                  grad: "from-gray-700 to-gray-500",
                  letter: "X",
                },
              ].map(({ label, handle, grad, letter }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/8 transition-all group"
                >
                  <div
                    className={`w-9 h-9 rounded-xl bg-linear-to-br ${grad} flex items-center justify-center shrink-0 text-white text-[11px] font-black`}
                  >
                    {letter}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-none mb-0.5">{label}</p>
                    <p className="text-xs text-gray-500 truncate">{handle}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
