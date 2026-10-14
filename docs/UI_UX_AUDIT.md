# Audit UI/UX Vincere

Passe du 14 octobre 2026. Identite visuelle conservee, sans deploiement ni
modification des donnees reelles. Les requetes des tests navigateur sont
interceptees sur un domaine Supabase fictif.

Apres cette verification locale, la livraison iOS **1.0.1 (build 6)** a ete
envoyee a Apple a la demande de l'editeur. Son [statut de livraison](APP_STORE.md)
est distinct du perimetre de test decrit ci-dessous.

## Corrections par parcours

| Parcours         | Corrections                                                                                                                                                             | Benefice                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Accueil          | Prochaine seance datee, lien direct vers sa semaine et son detail, validation distincte, seances passees non cochees distinguees, informations redondantes retirees.    | Savoir quoi faire ensuite, sans valider une seance par erreur.              |
| Programme        | Semaine active avant les longs recapitulatifs, selecteur de semaine, details ouverts depuis le raccourci, phases conservees telles qu'enregistrees.                     | Acces plus rapide aux entrainements, sans inventer une progression.         |
| Personnalisation | Date et parametres de creation visibles, differences avec le profil expliquees, regeneration explicite pre-remplie.                                                     | Comprendre pourquoi un ancien programme ne correspond pas au profil actuel. |
| Seances          | Titres courts et objectif long en description, date secondaire, mesures adaptees au running et a la force, valeurs sans objet masquees, secondes converties en minutes. | Lire les consignes sans ambiguite ni valeurs N/A.                           |
| Constructeur     | Deux chemins conserves, suggestions running specifiques, commandes plus/moins nommees, duree totale et 10 minutes de preparation expliquees, panier accessible.         | Composer une seance adaptee et comprendre son estimation.                   |
| Records          | Ajout dans l'en-tete, validation par categorie, erreurs de champ, etats de sauvegarde, prevention des doubles soumissions, historique et comparaisons compatibles.      | Eviter les enregistrements vides et conserver les saisies en cas d'echec.   |
| Notes            | Titres longs sur plusieurs lignes, compteur, edition et annulation conserves, fenetre d'ajout accessible.                                                               | Identifier la bonne seance sans perdre une note.                            |
| Profil           | Sections repliables avec resumes, selections exposees avec aria-pressed, modifications en attente et erreurs visibles, sauvegarde attendue.                             | Reduire le defilement et rendre la sauvegarde fiable.                       |
| Onboarding       | Objectif precis requis evident, raisons du bouton desactive expliquees, etapes facultatives identifiees, retour nomme et reponses conservees.                           | Terminer les 13 etapes sans blocage implicite.                              |
| Assistance       | Modales natives partagees, version visible dans le compte et l'assistance, commande de copie.                                                                           | Contact et diagnostic plus accessibles.                                     |

## Donnees et erreurs

- Le chargement initial n'est plus affiche comme une absence de programme.
- Un echec de lecture affiche une erreur et une action de reprise. Les donnees
  deja conservees peuvent rester consultables avec un avertissement.
- Une reponse serveur indiquant aucun programme actif ne reactive plus
  automatiquement un ancien programme du cache.
- La generation attend l'enregistrement avant d'afficher le succes. Si la
  sauvegarde echoue, la generation reste disponible pour reessayer sans refaire
  la demande IA pendant que cet ecran reste ouvert.
- Le nouveau programme est insere inactif. L'ancien reste actif pendant
  l'enregistrement des semaines et seances. Les erreurs declenchent un nettoyage
  et une tentative de restauration.
- Les anciens records incomplets restent visibles comme tels. Aucun nettoyage
  destructif automatique n'a ete ajoute.
- La fin de l'onboarding propose **Generer mon programme**. Aucun code PDF ni
  dependance PDF n'a ete trouve dans `src` et `package.json`.

La migration locale
[`20261014141541_validate_record_measures.sql`](../supabase/migrations/20261014141541_validate_record_measures.sql)
ajoute une contrainte `CHECK NOT VALID` : les nouvelles ecritures sont controlees,
mais les anciens records incomplets ne sont pas supprimes. Elle a ete executee
deux fois dans une base PGlite isolee, avec essais d'insertion valide et invalide.
**Elle n'a pas ete appliquee au backend distant.**

## Verification

| Format CSS | Moteur                   | Apparences      |
| ---------- | ------------------------ | --------------- |
| 320 x 720  | WebKit, emulation iPhone | Clair et sombre |
| 390 x 844  | WebKit, emulation iPhone | Clair et sombre |
| 1024 x 768 | WebKit, emulation iPad   | Clair et sombre |
| 1440 x 900 | Chromium                 | Clair et sombre |

Parcours executes automatiquement :

- Arrivee publique, connexion, inscription, reinitialisation du mot de passe,
  confidentialite, conditions et assistance.
- Accueil connecte, lien vers la prochaine seance, bonne semaine et detail
  ouvert, absence de debordement horizontal.
- Contact : Tab dans la fenetre, Echap, restitution du focus, formulaire ferme
  retire du DOM. Assistant et informations d'exercice : ouverture et Echap.
- Contact avec hauteur reduite a 480 px : champ Message consultable et fermeture
  accessible. Ce test ne simule pas un clavier iOS reel.
- Records : ajout distinct de l'assistant, mesures obligatoires, charge zero
  valide, echec simule, saisie conservee, reprise et succes.
- Seance running : duree de travail sans repetitions fictives, echauffement et
  recuperation en minutes, minuteur demarre puis mis en pause, ressenti choisi,
  retour vers la liste.
- Constructeur running : suggestions, ajout, increment, estimation avec
  preparation, panier au-dessus de la navigation et vidage.
- Notes : titre long, compteur, annulation et enregistrement sur donnees de test.
- Profil : sections repliables, changement de poids, erreur de sauvegarde
  conservee, pages legales et retour au bon onglet.
- Onboarding : 13 etapes en clair et sombre, dependances, selections, retour
  conservant les reponses et derniere action sans PDF.
- Generation : erreur IA simulee, reprise avec le meme profil, succes et refus
  de consentement sans appel au service.
- Lecture : attente avant resultat, erreur distincte de l'etat vide, reprise,
  programme absent ne restaurant pas le cache.

Les tests unitaires couvrent aussi les mesures de musculation, les unites
compactes (`90s`, `5km`), le calendrier et les seances passees, les differences
de profil, la validation SQL et la protection de l'ancien programme lors d'un
echec d'insertion ou d'activation.

### Commandes

```sh
vp check
vp test
vp exec playwright test e2e/audit.spec.ts e2e/mobile.spec.ts --timeout=45000
vp run build
git diff --check
```

Resultats finaux :

- `vp check` : aucune erreur ni avertissement de format, lint ou types.
- `vp test` : **50 tests passes**, dans 6 fichiers.
- Playwright : **84 tests passes**, soit 21 scenarios sur chacun des 4 formats.
- `vp run build` : compilation TypeScript et bundle de production reussis.
- `git diff --check` : aucun probleme d'espacement.

### Contrastes mesures

Calcul sur les couleurs CSS resolues, avec composition des fonds transparents.
Seuil verifie : **4.5:1** pour les textes selectionnes. Ce n'est pas une
certification exhaustive WCAG de l'application.

| Element                              | Clair   | Sombre  |
| ------------------------------------ | ------- | ------- |
| Action Consulter la seance           | 17.85:1 | 19.04:1 |
| Texte secondaire de l'accueil        | 5.92:1  | 10.12:1 |
| Texte secondaire du constructeur     | 5.26:1  | 5.33:1  |
| Libelle Exercice de la modale record | 17.85:1 | 17.06:1 |

Mesures completes : [clair](ui-audit/contrast-light.json) et
[sombre](ui-audit/contrast-dark.json).

## Captures apres correction

Captures de viewport avec animations stabilisees. Donnees fictives uniquement.

| Vue                                | Mobile                                                        | Ordinateur                                                      |
| ---------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| Accueil clair                      | [390 px](ui-audit/screenshots/mobile-accueil-clair.png)       | [1440 px](ui-audit/screenshots/desktop-accueil-clair.png)       |
| Programme sombre, acces direct     | [390 px](ui-audit/screenshots/mobile-programme-sombre.png)    | [1440 px](ui-audit/screenshots/desktop-programme-sombre.png)    |
| Constructeur running sombre        | [390 px](ui-audit/screenshots/mobile-builder-sombre.png)      | [1440 px](ui-audit/screenshots/desktop-builder-sombre.png)      |
| Record, erreur et saisie conservee | [390 px](ui-audit/screenshots/mobile-record-erreur-clair.png) | [1440 px](ui-audit/screenshots/desktop-record-erreur-clair.png) |
| Profil en accordeons               | [clair](ui-audit/screenshots/mobile-profil-clair.png)         | [sombre](ui-audit/screenshots/desktop-profil-sombre.png)        |

Autres vues : [seance et minuteur](ui-audit/screenshots/mobile-seance-sombre.png),
[notes](ui-audit/screenshots/mobile-notes-clair.png),
[accueil etroit](ui-audit/screenshots/etroit-accueil-clair.png),
[contact en hauteur reduite](ui-audit/screenshots/contact-hauteur-reduite-sombre.png),
[derniere etape sombre](ui-audit/screenshots/onboarding-final-sombre.png).

## Limites et suite

- Pas de deploiement Netlify, Supabase, App Store ou TestFlight dans cette passe.
- Migration records a valider sur staging, puis appliquer explicitement avant
  de compter sur la nouvelle protection cote base.
- Aucun appel IA reel ni sauvegarde sur un vrai compte pendant ces tests.
  La disponibilite, les quotas et la qualite du service de production restent
  a verifier avec un compte dedie.
- WebKit en emulation n'est pas WKWebView sur un appareil. Clavier iOS, zones
  sures physiques, VoiceOver, presse-papiers natif et mise en arriere-plan du
  minuteur restent a tester sur iPhone/iPad.
- Les sauvegardes du programme utilisent plusieurs requetes : le nettoyage et
  la restauration sont au mieux, pas une transaction serveur atomique. Une
  coupure pendant le changement de programme actif peut necessiter une reprise.
- Les sauvegardes de notes et de ressenti conservent le mecanisme de
  synchronisation existant. Les tests verifient leur interaction avec un serveur
  simule, pas une garantie de synchronisation hors ligne.
- Les phases anciennes identiques restent identiques si c'est la donnee stockee.
  Aucune progression manquante n'est reconstruite arbitrairement.
- Le symbole **P** de l'etat sans programme est conserve comme demande.
