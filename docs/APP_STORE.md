# Vincere - Preparation App Store

## Etat de livraison

Le depot contient le projet iOS Capacitor, les adaptations mobiles et les parcours de confidentialite. Les scripts de preparation ne deploient pas automatiquement Supabase, Netlify ou App Store Connect.

Le Mac utilise pour la livraison du 14 octobre 2026 dispose de **Xcode 27 et du SDK iOS 27**. Les controles natifs, la compilation et la signature ont reussi.

### Livraison 1.0.1

- Version : **1.0.1**, numero de build **7** (le build 6, envoye plus tot le 14 octobre 2026, est remplace).
- Bundle : `app.vincere.fitness` ; application App Store Connect `6821321431`.
- Archive locale : `build/Vincere-1.0.1-7.xcarchive`, non suivie par Git.
- Envoi : reussi le 14 octobre 2026 ; Xcode a confirme `Upload succeeded` et `EXPORT SUCCEEDED`. Apple a commence le traitement du package.
- Contenu : refonte UI/UX ([voir le detail](UX_REVAMP.md)), notes libres, generation du programme en arriere-plan. Le builder de seance libre est masque ([voir](free-session-builder/README.md)).
- Verification : controles de code, 57 tests unitaires et suite navigateur passes, controles iOS reussis.
- Les migrations Supabase `20261014141541` (contrainte des records) et `20261015090000` (table `user_notes`) sont appliquees au serveur.

**Envoi ne signifie pas publication publique.** La selection du build pour la version 1.0.1, sa soumission a App Review et sa disponibilite publique n'ont pas ete effectuees ni verifiees ici. L'acces a l'interface App Store Connect par l'outil de controle du navigateur etait indisponible pendant cette livraison.

## Identite

| Champ                   | Valeur                                      |
| ----------------------- | ------------------------------------------- |
| Application             | Vincere                                     |
| Editeur communique      | Blacksea                                    |
| Support                 | taylanethan@gmail.com                       |
| Site public             | https://vincere-fitness.netlify.app         |
| Support URL             | https://vincere-fitness.netlify.app/support |
| Privacy URL             | https://vincere-fitness.netlify.app/privacy |
| Conditions              | https://vincere-fitness.netlify.app/terms   |
| Bundle ID propose       | app.vincere.fitness                         |
| Version / build initial | 1.0.0 / 1                                   |
| Cible                   | iPhone et iPad, iOS 17+                     |
| Langue principale       | Francais                                    |
| Categorie proposee      | Forme et sante                              |

Verifier la disponibilite du Bundle ID dans le compte Apple Developer avant sa reservation. Blacksea est le nom fourni, pas une verification de l'identite juridique du vendeur Apple. Un compte Apple individuel peut afficher le nom legal de son titulaire. Ne pas inventer de numero d'entreprise ou d'adresse.

## Construction

```sh
vp install --frozen-lockfile
vp check
vp test --run
vp exec playwright install chromium webkit
vp run test:e2e
vp run ios:prepare
vp run ios:check
vp run ios:open
```

`ios:prepare` regenere l'icone opaque 1024px, le lancement clair/sombre, compile les fichiers web et synchronise les plugins Swift Package Manager. Le projet embarque `dist` : aucun `server.url` distant ni serveur de developpement ne doit etre utilise pour la livraison. Les fichiers `ios/App/App/public` et la configuration generee restent ignores par Git ; ils sont recrees par cette commande.

Dans Xcode : choisir la Team, verifier Signing & Capabilities, puis Product > Archive et Distribute App > App Store Connect. Une alternative est `APPLE_TEAM_ID=TONTEAMID10 vp run ios:archive`, apres la premiere preparation. Augmenter `CURRENT_PROJECT_VERSION` avant chaque nouvel upload. Les certificats, profils de provisioning, accords Apple et identifiants App Store Connect ne sont pas fournis par le depot.

Le workflow `.github/workflows/ios-validation.yml` est manuel et ne publie rien. Renseigner les variables GitHub `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` avec les valeurs publiques du projet de staging. Il teste puis compile sans signature sur macOS 26. Il n'a pas ete execute lors de la preparation locale.

Playwright est fige a 1.57.0 pour permettre les tests locaux sous macOS 13. Son WebKit local est une version figee : ces tests ne remplacent pas Safari/WKWebView iOS 26. Mettre a jour cet outil apres la mise a jour du Mac et refaire les captures.

## Configuration publique et secrets

`.env.native` contient uniquement les informations publiques fournies par l'editeur. Les cles Supabase publiques viennent de `.env.local`, `.env` ou des variables du CI. Les cles `service_role`, OpenAI et Apple ne doivent jamais avoir de prefixe `VITE_` ni etre ajoutees a Git.

Une ancienne variable locale `VITE_OPENAI_API_KEY` a ete renommee `OPENAI_API_KEY` sans changer sa valeur. Cela ne configure pas automatiquement le secret de l'Edge Function. Si cette cle a deja ete exposee dans une ancienne version web, la revoquer et la remplacer chez OpenAI, puis mettre a jour le secret Supabase. Ne jamais mettre la nouvelle cle dans Netlify comme variable `VITE_`.

## Backend avant livraison

1. Utiliser d'abord un projet de staging contenant le schema et les migrations historiques `schema.sql` et `migrations/001...006`. Le dossier `supabase/migrations` ajoute ici une migration incrementale, pas un historique complet pour initialiser une base vide. Ne pas lancer aveuglement `db reset` ou `db push` sur la production.
2. Sauvegarder la base et verifier les comptes orphelins avec la requete ci-dessous. Si des lignes existent, examiner leur origine ; ne pas les supprimer automatiquement.
3. Appliquer `supabase/migrations/20261008085025_app_store_account_deletion.sql` avec le circuit de migration habituel, puis verifier `select public.account_deletion_ready();` en role administrateur/service. Le resultat doit etre `true`. La fonction est volontairement interdite aux roles publics.
4. Deployer les Edge Functions `delete-account` et `ai-coach` apres verification de la configuration du projet cible. `verify_jwt = false` au niveau de la passerelle est intentionnel : les actions protegees verifient elles-memes l'identite via `auth.getUser()`. Ne pas retirer ces verifications.
5. Configurer `OPENAI_API_KEY` uniquement dans les secrets Supabase. Verifier les quotas et la facturation cote fournisseur. La limitation IA existante est en memoire par instance ; pour une exploitation a grande echelle, ajouter une limite persistante avant d'augmenter le trafic.
6. Publier cette version web sur Netlify avec `vp run build` et `dist`. Verifier les trois URL publiques dans une fenetre privee, sans compte. L'ancienne version web n'envoie pas encore `consentVersion` : coordonner le deploiement web et celui de `ai-coach`, puis faire recharger les anciens clients.
7. Tester la suppression avec deux comptes de test : seul le compte confirme doit disparaitre, avec ses programmes, seances, records et contacts lies. Verifier aussi l'impossibilite de recreer ses donnees avec un ancien jeton. Les contacts anonymes, les copies partagees, les e-mails et sauvegardes des prestataires demandent un traitement distinct.

```sql
select u.id
from public.users as u
left join auth.users as a on a.id = u.id
where a.id is null;
```

La suppression exige le mot de passe et `SUPPRIMER`, revoque les sessions puis supprime l'identite Auth. Les relations SQL assurent l'effacement en cascade. Le serveur refuse l'operation si la migration n'est pas installee. Si des uploads Storage sont ajoutes plus tard, leur effacement devra etre integre avant la suppression Auth.

L'export JSON propose dans le profil est **un export des donnees disponibles sur l'appareil**, pas un export exhaustif du serveur : l'hydratation actuelle charge notamment les 30 dernieres seances et le programme actif. Toute demande d'acces complete doit etre traitee par le support.

## Authentification iOS

- La version native utilise e-mail/mot de passe et PKCE. Google reste disponible uniquement sur le web. Ajouter Sign in with Apple avant de reactiver un fournisseur social dans l'app iOS, sauf exception applicable validee avec Apple.
- Configurer dans Supabase Auth la Site URL `https://vincere-fitness.netlify.app` et les redirections autorisees `https://vincere-fitness.netlify.app/**` et `app.vincere.fitness://auth/callback**`.
- Activer la confirmation e-mail et un SMTP de production, definir un mot de passe minimum de 8 caracteres, et verifier les limites d'envoi. Le `config.toml` local ne modifie pas automatiquement les reglages heberges.
- Les liens PKCE doivent etre demandes depuis l'app puis ouverts sur le meme appareil. Tester inscription, recuperation, lien expire, lien reutilise, app fermee et app deja ouverte. Les anciens comptes Google peuvent definir un mot de passe via la recuperation.
- Aucun achat ni abonnement payant n'est propose dans cette version native. Ne pas ajouter un paiement web pour des fonctionnalites numeriques sans traiter les exigences d'achats integres applicables.

## Confidentialite et informations Apple

Le manifeste `PrivacyInfo.xcprivacy` est inclus dans les ressources Xcode. Il declare l'usage FileTimestamp `C617.1` pour les fichiers exportes dans le cache de l'app, sans suivi publicitaire. Les plugins fournissent aussi leurs propres manifestes. Verifier le rapport de confidentialite de l'archive finale dans Xcode.

Preparation des etiquettes App Privacy, a confronter aux prestataires et a leurs reglages reels :

| Donnees                       | Finalite                                                   | Liees au compte      | Suivi publicitaire |
| ----------------------------- | ---------------------------------------------------------- | -------------------- | ------------------ |
| E-mail, pseudo et identifiant | Connexion, synchronisation, support                        | Oui                  | Non                |
| Sante et condition physique   | Profil, limitations facultatives, programme et progression | Oui                  | Non                |
| Notes, messages, support      | Fonctionnement demande par l'utilisateur                   | Oui lorsque connecte | Non                |

Ne pas declarer « aucune donnee collectee ». La version actuelle n'utilise pas HealthKit, localisation, contacts, microphone, publicite ou ATT. Aucun acces systeme inutile n'est demande.

**Validation juridique encore necessaire avant publication** : identite/adresse legales de Blacksea, responsable de traitement, bases legales dont informations de sante, region du projet Supabase, transferts internationaux, contrats/DPA OpenAI et Supabase, conservation exacte des sauvegardes/journaux et demandes d'effacement, traitement des mineurs. Les pages fournies sont un socle editorial, pas une certification de conformite. Completer les durees et garanties a partir des contrats effectivement souscrits.

## Fiche App Store proposee

**Nom :** Vincere

**Sous-titre :** Programmes et suivi sportif

**Description :**

Vincere rassemble tes programmes, tes seances et tes progres sportifs. Cree un programme adapte a ton objectif, compose une seance libre et retrouve tes entrainements en un seul endroit.

Suis tes records, note ton ressenti et utilise le minuteur de recuperation pendant ta seance. Consulte ton programme dans l'app ou partage une seance avec la feuille de partage de ton appareil.

Le coach IA est facultatif et demande ton accord avant de transmettre tes informations sportives a OpenAI. Les suggestions peuvent contenir des erreurs et ne remplacent pas un professionnel de sante. La generation et la synchronisation necessitent Internet. Les entrainements deja enregistres sur cet appareil restent consultables hors connexion.

**Mots-cles proposes :** fitness,sport,entrainement,running,musculation,programme,seance,progression

Remplir les questionnaires d'age, de contenu IA, de droits sur les contenus et de disponibilite selon les usages reels. Ne pas revendiquer de resultats medicaux ni garantir les performances. Confirmer l'exemption chiffrement declaree (`ITSAppUsesNonExemptEncryption = false`, usage HTTPS standard) selon la distribution choisie.

## Recette TestFlight obligatoire

- [ ] Compilation iOS 26+ et archive signee validee par Xcode.
- [ ] Premier lancement, mode sans compte, inscription/confirme, connexion, recuperation et reconnexion apres relance.
- [ ] Consentement accepte/refuse, retrait, changement de compte et generation reelle avec profil running puis autre objectif.
- [ ] Programme long, reprise apres relance, partage annule, liens de seance valides/invalides.
- [ ] Suppression reelle d'un compte de test et verification SQL, export local, compte de controle intact.
- [ ] Mode avion : consultation du cache, generation refusee, erreurs reseau lisibles. La synchronisation des modifications hors ligne n'est pas garantie ; il n'y a pas encore de file de synchronisation durable.
- [ ] Encoche, indicateur d'accueil, clavier, rotation, petit iPhone, iPad et multitache. Verifier les modales longues et le panneau de creation.
- [ ] VoiceOver, taille de texte agrandie, contraste clair/sombre/systeme et reduction des animations.
- [ ] Minuteur apres mise en arriere-plan. Il rattrape le temps ecoule au retour ; il n'envoie pas de notification locale lorsque l'app est suspendue.
- [ ] Captures des appareils reels/simulateurs aux tailles demandees dans App Store Connect. Les PNG Playwright sont des preuves de QA web, pas des captures App Store definitives.
- [ ] Compte de demonstration dedie et instructions de connexion pour App Review, sans donnees personnelles reelles. Backend disponible pendant toute la revue.

## Sources verifiees

- [Exigences SDK Apple](https://developer.apple.com/news/?id=ueeok6yw)
- [App Review Guidelines : compte, confidentialite, IA, connexion et achats](https://developer.apple.com/app-store/review/guidelines/)
- [Suppression de compte Apple](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)
- [Environnement Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Manifeste Filesystem](https://capacitorjs.com/docs/apis/filesystem)
- [Liens natifs Supabase](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Vite+ CI](https://www.viteplus.dev/guide/ci)
