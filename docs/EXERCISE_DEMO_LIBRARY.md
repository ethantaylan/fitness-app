# Bibliothèque partagée de démonstrations

Les 17 fiches Everkinetic embarquées sont prioritaires et consultables hors connexion.
Pour une fiche manquante : consultation de la base, création d’une entrée unique,
réservation atomique puis **un seul appel** à l’API Images OpenAI (`gpt-image-2`,
`n: 1`, PNG 1536×1024, qualité medium). L’image contient les deux positions.
Le résultat est stocké dans le bucket privé `exercise-demo-library` et partagé
avec les comptes via une URL signée d’une heure. Le cache client dure cinq minutes.

## Une seule tentative payante

La clé normalise accents, casse, espaces, apostrophes et tirets. Elle conserve
le matériel et les variantes. Les synonymes vérifiés sont associés par alias ;
la normalisation ne prétend pas fusionner automatiquement tous les synonymes.
La contrainte primaire empêche les lignes dupliquées, y compris entre comptes.
`exercise_demo_claim` verrouille la ligne et enregistre un token permanent
**avant** l’appel au fournisseur. Un autre serveur reçoit `claimed: false`.
Il n’y a ni bail renouvelable, ni reset automatique du token, ni retry HTTP/SDK.

Les deux risques sont volontairement traités différemment :

- Si le PNG a été stocké mais la finalisation a été interrompue, la prochaine
  demande retrouve le fichier et finalise la même fiche sans générer d’image.
- Si le fournisseur a potentiellement facturé mais que le fichier n’a pas été
  reçu, la tentative reste `uncertain` (ou `generating` si le worker a été tué).
  On **ne régénère pas** automatiquement. Après dix minutes, la consultation
  indique une indisponibilité. Vérifier manuellement la tentative, les journaux
  et Storage ; ne pas effacer le token pour relancer aveuglément.

Cette garantie porte sur **au plus un appel de génération par clé**, pas sur
la livraison garantie d’une image en cas de panne entre deux services.

## Accès, consentement et compatibilité

L’endpoint vérifie le JWT avec `auth.getUser()`. Une réservation exige que le nom
figure dans une séance enregistrée du compte. Seul le nom du mouvement est envoyé
à OpenAI, jamais les mensurations, blessures, notes ou données du profil.
Le client demande l’accord IA déjà utilisé par Vincere avant une première demande.
Les lectures de suivi (`lookup`) ne démarrent jamais de génération.
Les 50 nouvelles demandes par jour et par compte restent distinctes du quota des
programmes. Les tables internes et RPC de génération sont réservées au rôle serveur.
La clé OpenAI reste dans les secrets Supabase ; aucune variable VITE ne la contient.

Les images automatiques portent `reviewed: false` et un crédit explicite de génération
par IA sans vérification manuelle. Les instructions spécifiques figurent sur l’image ;
les consignes enregistrées de la séance restent affichées. Le champ `reviewed_at`
reste nul pour les images automatiques. Les brouillons manuels ne sont pas publiés.
Les anciens builds qui promettent une vérification manuelle ne déclenchent pas de
génération et ne reçoivent pas les illustrations automatiques : le client annonce
`automatic: true` pour activer ce flux et afficher sa provenance correctement.

## Exploitation manuelle et alias

Le script `scripts/exercise-demo-library.mjs` reste disponible pour ajouter une
illustration validée manuellement, examiner la file et associer un synonyme vérifié.
Il exige `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans l’environnement local
administrateur. Ne jamais mettre la clé dans `VITE_`, dans Git ou dans le chat.

```sh
node scripts/exercise-demo-library.mjs list
node scripts/exercise-demo-library.mjs alias 'builtin:barbell-squat' 'synonyme vérifié'
node scripts/exercise-demo-library.mjs stage 'clé' /chemin/demo.png /chemin/guide.json
node scripts/exercise-demo-library.mjs approve 'clé' --reviewed
```

Le JSON manuel contient `title`, `steps` (au moins deux consignes françaises) et
`mistake`. Un fichier existant n’est jamais remplacé par un import différent.
Les fiches publiées sont immuables. Les fiches rejetées restent enregistrées.
Les dix entrées préparées avant le passage au mode automatique ne sont pas lancées
en lot : elles seront traitées individuellement lors d’une première consultation
compatible, avec une séance du compte qui contient effectivement l’exercice.

## Déploiement et vérification

Appliquer les migrations `exercise_demo_library` puis
`exercise_demo_automatic_generation` ; déployer la fonction `exercise-demo` avec
contrôle JWT interne. `OPENAI_API_KEY` est le seul secret de fournisseur nécessaire.
Aucun cron et aucun appel IA depuis le navigateur ne sont utilisés.

Les tests du fournisseur sont **simulés**, et les fonctions SQL sont exécutées
sur PGlite. Couverture : concurrence, seconde consultation, timeout, récupération
d’un PNG stocké, absence de clé, refus d’accès et séparation des variantes.
Aucune création réelle de programme ni image payante n’est nécessaire aux tests.
