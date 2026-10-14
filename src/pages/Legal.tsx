import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { publisherName, supportEmail, LEGAL_VERSION } from "../lib/legal";
import { revokeAIConsent } from "../lib/aiConsent";
import AppVersion from "../components/AppVersion";

export default function Legal() {
  const [consentMessage, setConsentMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { pathname, search } = useLocation();
  const fromAccount = new URLSearchParams(search).get("from") === "account";
  const returnTo = fromAccount ? "/settings?tab=compte" : "/";
  const isPrivacy = pathname === "/privacy";
  const isSupport = pathname === "/support";
  const title = isPrivacy
    ? "Confidentialité"
    : isSupport
      ? "Assistance"
      : "Conditions d'utilisation";
  return (
    <main className="legal-page mx-auto max-w-2xl px-5 py-8 pb-32">
      <Link
        to={returnTo}
        className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
      >
        <ArrowLeft size={18} /> {fromAccount ? "Retour au profil" : "Vincere"}
      </Link>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">Mise à jour : {LEGAL_VERSION}</p>
      {isPrivacy ? (
        <>
          <section>
            <h2>Les données utilisées</h2>
            <p>
              Vincere utilise ton adresse e-mail et ton identifiant de compte pour la connexion,
              ainsi que ton pseudo facultatif. Ton profil sportif, tes programmes, tes séances, tes
              records, tes notes et ton accord pour l'IA sont enregistrés pour fournir le service et
              synchroniser tes appareils.
            </p>
            <p>
              Les informations de santé, comme les limitations physiques et les restrictions
              alimentaires, sont facultatives. Ne communique que ce qui est utile à ton
              entraînement.
            </p>
          </section>
          <section>
            <h2>Hébergement et intelligence artificielle</h2>
            <p>
              Supabase fournit l'authentification, la base de données et les fonctions serveur.
              Après ton accord explicite, OpenAI reçoit les informations sportives nécessaires à la
              génération, ou les messages envoyés à l'assistant. Le nom et l'adresse e-mail de ton
              compte ne sont pas inclus dans les requêtes de génération.
            </p>
            <p>
              Les données de ton compte sont conservées jusqu'à sa suppression. Les prestataires
              peuvent conserver temporairement des sauvegardes ou des journaux techniques selon
              leurs conditions de traitement. Contacte Blacksea pour toute demande portant sur des
              données déjà transmises ou sur leur conservation.
            </p>
          </section>
          <section>
            <h2>Stockage sur l'appareil et partage</h2>
            <p>
              Une copie de tes entraînements et de ton profil est conservée sur cet appareil pour
              permettre leur consultation hors connexion. Elle est effacée à la déconnexion. Un
              export ou une séance que tu partages peut contenir des informations personnelles :
              vérifie le destinataire avant de confirmer le partage.
            </p>
            <p>
              Vincere n'intègre ni publicité, ni suivi publicitaire, ni accès à HealthKit, à la
              localisation, au micro ou aux contacts.
            </p>
          </section>
          <section>
            <h2>Tes choix et tes droits</h2>
            <p>
              Tu peux modifier ton profil, exporter les données disponibles dans Profil → Compte,
              retirer ton accord pour les prochains appels IA, ou supprimer ton compte et les
              données qui lui sont rattachées depuis la même page. Les copies que tu as partagées
              avec d'autres personnes ne peuvent pas être rappelées.
            </p>
            <p>
              Le retrait d'accord empêche les prochains envois à OpenAI ; il ne retire pas les
              données déjà traitées. Pour toute demande d'accès, de rectification ou d'effacement
              complémentaire, contacte l'éditeur.
            </p>
            <button
              type="button"
              className="app-secondary mt-4"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void revokeAIConsent()
                  .then(() => setConsentMessage("Accord retiré pour les prochains envois à l'IA."))
                  .catch(() =>
                    setConsentMessage(
                      "Le retrait n'a pas abouti. Vérifie ta connexion et réessaie.",
                    ),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              Retirer mon accord pour l'IA
            </button>
            {consentMessage && <p role="status">{consentMessage}</p>}
          </section>
        </>
      ) : isSupport ? (
        <>
          <section>
            <h2>Besoin d'aide ?</h2>
            <AppVersion />
            <p>
              Décris le problème, la version de Vincere et le modèle de ton appareil. N'envoie
              jamais ton mot de passe ni d'informations médicales par e-mail.
            </p>
          </section>
          <section>
            <h2>Connexion</h2>
            <p>
              Utilise « Mot de passe oublié » sur l'écran de connexion pour recevoir un lien. Pour
              l'app iPhone, demande le lien depuis l'app puis ouvre-le sur le même appareil. Un
              compte créé avec Google sur le web peut aussi définir un mot de passe par ce parcours.
            </p>
          </section>
          <section>
            <h2>Gestion du compte</h2>
            <p>
              La suppression définitive est disponible dans Profil → Compte. Un export de tes
              données et le retrait de ton accord pour l'IA sont accessibles au même endroit.
            </p>
          </section>
        </>
      ) : (
        <>
          <section>
            <h2>Un accompagnement sportif</h2>
            <p>
              Vincere permet de créer et suivre des entraînements, de noter ses progrès et
              d'exporter ses programmes. Les suggestions générées par IA peuvent contenir des
              erreurs ; vérifie leur pertinence avant de les suivre.
            </p>
          </section>
          <section>
            <h2>Santé et pratique</h2>
            <p>
              Vincere n'est pas un dispositif médical et ne fournit ni diagnostic, ni traitement.
              Adapte chaque exercice à tes capacités, arrête en cas de douleur et demande l'avis
              d'un professionnel qualifié en cas de blessure ou de doute. Les indications
              nutritionnelles sont générales.
            </p>
          </section>
          <section>
            <h2>Compte et accès</h2>
            <p>
              Garde tes identifiants confidentiels et fournis des informations exactes. Les
              fonctionnalités IA nécessitent une connexion à Internet et ton accord pour le partage
              avec OpenAI. Elles peuvent être temporairement indisponibles ou soumises à des limites
              d'usage.
            </p>
          </section>
          <section>
            <h2>Suppression et contenus</h2>
            <p>
              Tu peux demander la suppression de ton compte directement dans l'application. Tes
              fichiers exportés restent sous ton contrôle. Ne partage pas les informations
              personnelles d'un tiers sans son accord.
            </p>
          </section>
        </>
      )}
      <section>
        <h2>Éditeur et contact</h2>
        <p>
          {publisherName ||
            "Les informations de l'éditeur seront renseignées avant la publication."}
        </p>
        {supportEmail ? (
          <a
            className="inline-flex min-h-11 items-center gap-2 underline"
            href={`mailto:${supportEmail}`}
          >
            <Mail size={18} /> {supportEmail}
          </a>
        ) : (
          <p>Le contact de support sera renseigné avant la publication.</p>
        )}
      </section>
      <nav
        className="mt-8 flex flex-wrap gap-5 text-sm underline"
        aria-label="Informations légales"
      >
        <Link to={`/privacy${fromAccount ? "?from=account" : ""}`}>Confidentialité</Link>
        <Link to={`/terms${fromAccount ? "?from=account" : ""}`}>Conditions</Link>
        <Link to={`/support${fromAccount ? "?from=account" : ""}`}>Assistance</Link>
      </nav>
    </main>
  );
}
