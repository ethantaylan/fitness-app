# Refonte UI/UX de Vincere

Chantier P1 → P3 appliqué sur l'application mobile-first. Captures avant/après dans
[`ui-audit/ux-revamp/`](ui-audit/ux-revamp) (iPhone 375 px et bureau 1280 px, thèmes clair et sombre).

## Règles de conception retenues

- **Une couleur de marque + trois sémantiques.** Émeraude pour la marque (et le « fait »),
  ambre pour l'avertissement (« à rattraper »), rouge pour le danger. Les boutons principaux restent
  encre/papier, fidèles au logo noir et blanc. Jetons : `--theme-brand*`, `--theme-warn*`,
  `--theme-danger*` dans `src/index.css`, exposés en utilitaires Tailwind (`bg-brand-soft`,
  `text-warn`, `border-line`, `bg-card`…) qui suivent le thème sans surcharge `html[data-theme]`.
- **Vocabulaire.** « Séance » = une session ; « programme » = le plan de 8 semaines ; l'onglet
  « Entraînements » devient **Séances** (séances libres). « Records » devient **Performances**.
- **Typographie.** Space Grotesk pour les titres (h1–h3) et les chiffres clés (`.font-display`),
  Plus Jakarta Sans pour le reste.
- **Aucun bouton flottant en connecté.** L'assistant s'ouvre depuis l'en-tête (toutes les pages,
  y compris dans l'app native) ; les actions fixes (CTA de création, enregistrement du profil,
  validation d'une séance) vivent dans un `.app-dock` posé au-dessus de la navigation.

## Ce qui a changé

| Zone                     | Changements                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| En-tête                  | Plus de déconnexion ni de bouton « Contact » : le contact est unique (Profil → Compte → _Contacter l'assistance_, aussi proposé au bas de l'assistant). Boutons de 44 px. L'en-tête est aussi affiché dans l'app native (assistant + thème).                                                                                                                                   |
| Assistant                | Feuille flex (en-tête fixe, messages défilants, saisie fixe), jetons de thème, aligné sur `visualViewport` (clavier mobile) et `safe-area`.                                                                                                                                                                                                                                    |
| Navigation du bas        | Libellés 11 px, ≥ 4,5:1, état actif = barre de marque + fond + graisse. « Séances » ne tronque plus.                                                                                                                                                                                                                                                                           |
| Création de séance libre | Page plein écran avec **Retour**, plus de bandeau sombre ; CTA « Composer avec Vincere » dans un dock fixe ; icône d'Étirements remplacée ; pastille remplacée par une phrase ; couleurs décoratives retirées.                                                                                                                                                                 |
| Accueil                  | Une carte héro (salutation, prochaine séance, CTA « Commencer la séance », sans second bouton de validation : on coche depuis le Programme), bande de semaine (4 segments + pastilles _faite / à faire / aujourd'hui / à rattraper_), lien « Voir le programme », un seul bloc « Séance libre ».                                                                               |
| Programme                | Intro tronquée + « Voir plus », sélecteur S1…S8 horizontal, cartes compactes entièrement cliquables, **écran dédié par séance** (`/result?week=N&session=ID`), vocabulaire de maintien/respirations pour le yoga, métriques sans valeur orpheline, emplacement facultatif de visuel (`Exercise.media_url`), confirmation avant « Générer un nouveau programme » / suppression. |
| Séances                  | CTA, **modèles rapides** (préremplissent le constructeur), historique, état vide avec action.                                                                                                                                                                                                                                                                                  |
| Suivi                    | Onglets **Régularité** (séances de la semaine, séries de semaines et de jours, calendrier de 5 semaines), **Performances**, **Notes** (libres, ajoutables à tout moment comme les performances ; les anciennes notes de séance restent listées). État vide des performances avec CTA.                                                                                          |
| Profil                   | « Enregistrer les modifications » n'apparaît que si le formulaire a changé (dock), idem pour le pseudo ; Compte groupé par risque (données / IA avec confirmation / zone de danger avec confirmation forte) ; version copiable via une icône inline.                                                                                                                           |
| Thème sombre             | Logo conservé (V blanc sur tuile noire, liseré), titres et chiffres en jetons, plus de bouton flottant blanc.                                                                                                                                                                                                                                                                  |
| Ton                      | Prompt IA et prompt serveur imposent le tutoiement ; « flows » → « enchaînements » ; textes statiques corrigés.                                                                                                                                                                                                                                                                |

## Décisions à connaître

- **Mesure de la pratique.** Une séance du programme compte quand elle est cochée (date de
  validation) ; une séance libre compte quand un ressenti a été donné. Les séances libres ne stockent
  qu'une date sans année (« mercredi 14 octobre ») : l'occurrence passée la plus récente est retenue
  (`src/lib/practice.ts`).
- **Avertissement légal.** Le texte affiché est désormais fixe et tutoyé ; `legal_disclaimer`
  (généré par l'IA) reste stocké mais n'est plus affiché.
- **Programmes déjà générés.** Leurs conseils (`general_advice`) conservent le vouvoiement d'origine ;
  seuls les nouveaux programmes suivent le prompt corrigé.
- **Réseaux sociaux « bientôt ».** Les trois cartes désactivées de la fenêtre de contact ont été
  supprimées (décoratives, hors palette).
- **Minuteur de repos.** Reste flottant sur les séances libres (boutons passés à 44 px).

## Vérifier

```sh
vp check && vp test                        # lint, types, tests unitaires
vp exec playwright test                    # parcours + audit DOM (audit.spec, mobile.spec, ux-revamp.spec)
SHOTS_DIR=docs/ui-audit/ux-revamp/apres \
  vp exec playwright test e2e/shots.spec.ts --project=iphone-webkit --project=desktop-chromium
```

`e2e/ux-revamp.spec.ts` parcourt 16 écrans à 375, 567, 768 et 1280 px en clair et en sombre et vérifie
par script : cibles tactiles ≥ 44 px, texte ≥ 11 px, contraste ≥ 4,5:1 (3:1 pour les grands textes),
aucun élément recouvert en bas de page par la navigation, un dock ou un panneau fixe, aucun défilement
horizontal. L'assistant est testé sur une hauteur de 420 px (clavier ouvert simulé).

## Notes libres

Les notes ne sont plus rattachées à une séance. Elles sont enregistrées sur l'appareil immédiatement, puis
synchronisées avec la table `user_notes`, créée par
[`supabase/migrations/20261015090000_user_notes.sql`](../supabase/migrations/20261015090000_user_notes.sql)
(copie : `migrations/007_user_notes.sql`). Cette migration est appliquée sur le backend distant. L'absence de la
table ne bloquerait pas le chargement des autres données : les notes resteraient locales.

## Évolutions suivantes

- **Builder de séance libre masqué** (drapeau `FREE_SESSION_BUILDER_ENABLED`, code conservé) :
  procédure et prompt de réactivation dans [`free-session-builder/README.md`](free-session-builder/README.md).
- **Génération du programme en arrière-plan** : elle ne bloque plus l'écran. Un bandeau « Ton programme est
  en cours de création » reste visible au-dessus de la navigation, et un toast « Ton programme est prêt »
  (avec « Voir ») prévient à la fin. Elle vit tant que l'application reste ouverte : la fermer ou la mettre
  en veille longue l'interrompt, le bandeau propose alors « Réessayer ».
- **Profil** : toutes les sections sont en une seule colonne.

## Limites

- Le clavier iOS réel n'est pas simulé : la hauteur réduite et `visualViewport` sont testés, pas le
  comportement du clavier lui-même sur appareil.
- Les pages publiques (Landing, connexion, onboarding) n'ont pas été refondues ; elles gardent leurs
  boutons noirs et leurs surcharges de thème. Le contrôle automatique couvre les écrans connectés.
- `Exercise.media_url` n'est pas encore persisté en base ni produit par l'IA : l'emplacement est prêt,
  aucun visuel n'est affiché aujourd'hui.
