# Vincere

Application de fitness React/TypeScript distribuee sur le web et sur iOS avec
Capacitor.

Ce depot contient le projet Xcode, les ressources iOS, les parcours de
confidentialite et les controles necessaires a une publication App Store. Il ne
contient pas les certificats Apple, les secrets de production ni une archive
signee.

## Informations de l'application

| Champ              | Valeur                                      |
| ------------------ | ------------------------------------------- |
| Application        | Vincere                                     |
| Editeur communique | Blacksea                                    |
| Support            | taylanethan@gmail.com                       |
| Site               | https://vincere-fitness.netlify.app         |
| Support            | https://vincere-fitness.netlify.app/support |
| Confidentialite    | https://vincere-fitness.netlify.app/privacy |
| Conditions         | https://vincere-fitness.netlify.app/terms   |
| Bundle ID          | `app.vincere.fitness`                       |
| Version courante   | `1.0.1` (`build 6`)                         |
| Plateformes        | iPhone et iPad, iOS 17+                     |
| Langue principale  | Francais                                    |
| Categorie proposee | Forme et sante                              |

Blacksea est le nom d'editeur communique pour le projet. Apple peut afficher le
nom legal du titulaire si le compte Apple Developer est un compte individuel.

## 1. Prerequis

- Un Mac compatible avec **Xcode 26 ou plus recent** et le SDK iOS 26+.
- Node.js 22+ et Vite+ (`vp`).
- Un compte Apple Developer actif.
- Un projet App Store Connect avec les contrats, informations fiscales et
  bancaires acceptes lorsque necessaire.
- Les acces aux projets Supabase et Netlify de production.

La livraison du 14 octobre 2026 utilise Xcode 27 et le SDK iOS 27. L'archive
signee **1.0.1 (build 6)** a ete envoyee avec succes a App Store Connect.
Cet envoi ne constitue pas une validation Apple ni une publication publique.
Voir le [statut de livraison](docs/APP_STORE.md).

## 2. Installer et verifier le projet

Creer un fichier `.env.local` a partir de `.env.example`, puis renseigner les
valeurs publiques Supabase. Une cle `service_role`, OpenAI ou Apple ne doit
jamais porter le prefixe `VITE_` ni etre ajoutee a Git.

```sh
vp install --frozen-lockfile
vp check
vp test --run
vp exec playwright install chromium webkit
vp run test:e2e
vp run build
```

Les tests Playwright couvrent les modes clair et sombre, les ecrans publics et
connectes, le consentement IA et plusieurs formats iPhone, iPad et desktop.

Le [bilan UI/UX et ses captures](docs/UI_UX_AUDIT.md) detaille les corrections,
les parcours verifies et les limites des tests.

## 3. Preparer le backend Supabase

Effectuer ces operations sur un environnement de staging avant la production.

1. Sauvegarder la base de production.
2. Verifier que le schema historique et les migrations `migrations/001...006`
   sont deja presents. `supabase/migrations` ne reconstruit pas une base vide.
3. Rechercher les profils sans compte Auth avec la requete suivante. Examiner
   les resultats sans les supprimer automatiquement.

```sql
select u.id
from public.users as u
left join auth.users as a on a.id = u.id
where a.id is null;
```

4. Appliquer la migration
   `supabase/migrations/20261008085025_app_store_account_deletion.sql` avec le
   circuit de migration habituel du projet.
5. Executer `select public.account_deletion_ready();` avec un role
   administrateur. Le resultat doit etre `true`.
6. Deployer les Edge Functions `ai-coach` et `delete-account`.
7. Ajouter `OPENAI_API_KEY` aux secrets Supabase, sans prefixe `VITE_`.
8. Tester la creation puis la suppression d'un compte reel de test. Verifier
   que ses programmes, seances, records et contacts sont bien effaces, et qu'un
   ancien jeton ne permet plus de restaurer les donnees.

Dans Supabase Auth :

- definir la Site URL sur `https://vincere-fitness.netlify.app` ;
- autoriser `https://vincere-fitness.netlify.app/**` ;
- autoriser `app.vincere.fitness://auth/callback**` ;
- activer la confirmation d'e-mail et configurer un SMTP de production ;
- imposer au minimum huit caracteres pour les mots de passe ;
- verifier les quotas et limites d'envoi.

La version iOS utilise e-mail/mot de passe et PKCE. Google reste desactive dans
l'application native. Avant d'ajouter un autre fournisseur social, verifier
l'obligation correspondante de proposer Sign in with Apple.

## 4. Deployer le site et les pages legales

Construire puis publier `dist` sur Netlify :

```sh
vp run build
```

Verifier sans etre connecte et dans une fenetre privee :

- https://vincere-fitness.netlify.app/support
- https://vincere-fitness.netlify.app/privacy
- https://vincere-fitness.netlify.app/terms

Le site web et la nouvelle fonction `ai-coach` doivent etre deployes ensemble,
car le client transmet desormais la version du consentement IA.

Avant la publication, faire valider les pages legales avec les informations
reelles de Blacksea : identite et adresse legales, responsable de traitement,
region Supabase, conservation, sauvegardes, transferts internationaux, DPA
OpenAI/Supabase, traitement des donnees de sante et des mineurs.

## 5. Creer l'application chez Apple

1. Dans Apple Developer, reserver l'App ID explicite
   `app.vincere.fitness`.
2. Dans App Store Connect, creer une nouvelle application nommee **Vincere**.
3. Choisir iOS, le Bundle ID reserve et la langue principale francaise.
4. Conserver la version `1.0.0` et le build `1` pour le premier envoi.
5. Ajouter les utilisateurs App Store Connect qui doivent administrer ou
   tester l'application.
6. Dans Xcode, connecter le compte Apple dans Settings > Accounts.

Verifier la disponibilite du nom et du Bundle ID avant de finaliser la fiche.

## 6. Generer et ouvrir le projet iOS

```sh
vp run ios:prepare
vp run ios:check
vp run ios:open
```

`ios:prepare` regenere l'icone App Store opaque, les ecrans de lancement clair
et sombre, construit le bundle natif puis synchronise Capacitor et ses plugins.
Relancer cette commande apres chaque modification web destinee a iOS.

`ios:check` doit afficher tous les controles en `OK`. Les controles Xcode et SDK
resteront bloques tant que Xcode 26+ n'est pas installe.

## 7. Configurer Xcode

Dans le target **App** :

1. Ouvrir Signing & Capabilities.
2. Selectionner l'equipe Apple Developer.
3. Verifier que le Bundle Identifier est `app.vincere.fitness`.
4. Laisser Xcode gerer automatiquement la signature, sauf besoin specifique.
5. Verifier `Version = 1.0.0` et `Build = 1`.
6. Selectionner un appareil reel ou un simulateur iOS recent.
7. Compiler et lancer l'application.

Augmenter le numero de build avant chaque nouvel upload. Ne jamais reutiliser un
numero deja envoye a App Store Connect.

## 8. Recette sur appareil et TestFlight

Valider au minimum les points suivants :

- [ ] Premier lancement et mode sans compte.
- [ ] Inscription, confirmation d'e-mail, connexion et reconnexion apres relance.
- [ ] Mot de passe oublie, lien expire et lien deja utilise.
- [ ] Creation de programme running et autre objectif, sans exercices incoherents.
- [ ] Creation d'une seance libre, minuteur et retour d'arriere-plan.
- [ ] Acceptation, refus puis retrait du consentement IA.
- [ ] Consultation d'un programme long et reprise après relance de l'application.
- [ ] Suppression d'un compte de test et verification en base.
- [ ] Mode avion : cache accessible et erreurs reseau comprehensibles.
- [ ] Clair, sombre et theme systeme sur petit iPhone et iPad.
- [ ] Encoche, indicateur d'accueil, clavier, rotation et multitache iPad.
- [ ] VoiceOver, taille de texte agrandie, contraste et reduction des animations.
- [ ] Absence de secrets, logs sensibles ou donnees personnelles de test.

Le mode hors ligne permet de consulter les donnees deja presentes sur
l'appareil. Il n'existe pas encore de file durable garantissant la
synchronisation de modifications effectuees hors connexion.

## 9. Archiver et envoyer le build

Methode recommandee dans Xcode :

1. Selectionner `Any iOS Device (arm64)`.
2. Choisir Product > Archive.
3. Dans Organizer, lancer Validate App.
4. Corriger tous les avertissements bloquants.
5. Choisir Distribute App > App Store Connect > Upload.
6. Attendre le traitement du build dans App Store Connect.
7. Ajouter le build a un groupe TestFlight interne, puis externe si necessaire.

Une archive peut aussi etre preparee apres la configuration initiale de Xcode :

```sh
APPLE_TEAM_ID=TONTEAMID10 vp run ios:archive
```

Le workflow GitHub Actions `iOS validation` teste et compile sans signature sur
macOS 26. Il ne publie pas l'application.

## 10. Completer la fiche App Store

Texte propose :

**Nom :** Vincere

**Sous-titre :** Programmes et suivi sportif

**Description :**

> Vincere rassemble tes programmes, tes seances et tes progres sportifs. Cree
> un programme adapte a ton objectif, compose une seance libre et retrouve tes
> entrainements en un seul endroit.
>
> Suis tes records, note ton ressenti et utilise le minuteur de recuperation
> pendant ta seance. Consulte ton programme dans l'app ou partage une seance avec la
> feuille de partage de ton appareil.
>
> Le coach IA est facultatif et demande ton accord avant de transmettre tes
> informations sportives a OpenAI. Ses suggestions peuvent contenir des erreurs
> et ne remplacent pas un professionnel de sante. La generation et la
> synchronisation necessitent Internet.

**Mots-cles :**
`fitness,sport,entrainement,running,musculation,programme,seance,progression`

Ajouter egalement :

- l'URL de support et l'URL de confidentialite ;
- les captures iPhone et iPad aux dimensions demandees par App Store Connect ;
- une icone, une categorie, une classification d'age et les droits de contenu ;
- les informations de contact pour l'equipe de review ;
- un compte de demonstration dedie et les instructions pour le tester ;
- des notes expliquant le consentement IA et la suppression du compte.

Ne pas utiliser les captures Playwright comme captures App Store finales.
Realiser les captures definitives sur un simulateur ou un appareil recent, avec
des donnees de demonstration coherentes et sans informations personnelles.

## 11. Declarer la confidentialite

Ne pas selectionner « aucune donnee collectee ». La declaration doit etre
confirmee a partir des reglages reels de Supabase, OpenAI et des contrats signes.

| Donnees                     | Utilisation                                 | Liees au compte    | Suivi publicitaire |
| --------------------------- | ------------------------------------------- | ------------------ | ------------------ |
| E-mail, pseudo, identifiant | Connexion, synchronisation, support         | Oui                | Non                |
| Sante et condition physique | Profil, programme, limitations, progression | Oui                | Non                |
| Notes, messages, support    | Fonctionnement demande par l'utilisateur    | Selon la connexion | Non                |

La version actuelle n'utilise pas HealthKit, la localisation, les contacts, le
microphone, la publicite ou ATT. Le manifeste `PrivacyInfo.xcprivacy` est inclus
dans le projet. Examiner aussi le rapport de confidentialite produit par
l'archive Xcode finale.

Confirmer dans App Store Connect que l'application utilise uniquement le
chiffrement HTTPS standard et que `ITSAppUsesNonExemptEncryption = false`
correspond bien a la distribution choisie.

## 12. Envoyer en review

Avant de cliquer sur **Submit for Review** :

- [ ] Le build TestFlight final a ete teste sur un appareil reel.
- [ ] Le backend de production et les pages legales sont disponibles.
- [ ] Le compte de demonstration fonctionne et ne contient aucune donnee reelle.
- [ ] La suppression du compte fonctionne directement dans l'application.
- [ ] Les etiquettes App Privacy correspondent aux traitements reels.
- [ ] Les captures et textes ne promettent aucun resultat medical ou garanti.
- [ ] Les coordonnees de review et de support sont surveillees.
- [ ] Tous les contrats et questionnaires App Store Connect sont completes.
- [ ] La version et le numero de build correspondent au build selectionne.

Maintenir le backend et le compte de demonstration disponibles pendant toute la
revue Apple. Repondre dans App Store Connect si l'equipe demande une precision
sur l'IA, l'authentification ou la suppression du compte.

## Commandes utiles

```sh
# Developpement local
vp dev

# Validation complete
vp check
vp test --run
vp run test:e2e
vp run build

# Livraison iOS
vp run ios:prepare
vp run ios:check
vp run ios:open
```

## Architecture

- `src/pages`, `src/components` : parcours React, navigation et themes.
- `src/lib/native.ts`, `NativeLifecycle.tsx` : fonctions natives et liens Auth.
- `src/lib/aiConsent.ts` : consentement avant tout appel IA.
- `supabase/functions/ai-coach` : generation IA cote serveur.
- `supabase/functions/delete-account` : suppression avec reauthentification.
- `supabase/migrations` : migration incrementale necessaire a la suppression.
- `ios/` : projet Xcode et ressources natives.
- `scripts/ios-*.mjs` : preparation, audit et archivage.

Le dossier [docs/APP_STORE.md](docs/APP_STORE.md) contient les details techniques,
les limites connues et les sources officielles utilisees pendant la preparation.
