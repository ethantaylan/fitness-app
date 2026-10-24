# Bibliothèque partagée de démonstrations

Les consultations ne génèrent **jamais** d’image et n’appellent aucun fournisseur IA.
Les 17 fiches Everkinetic embarquées restent prioritaires et disponibles hors connexion.
À l’ouverture d’une fiche manquante, l’app demande une fiche commune à Supabase.
Si elle n’existe pas, une seule entrée est créée, uniquement si le nom figure dans
une séance enregistrée du compte. Les notes, mensurations et profils ne sont pas
copiés dans cette bibliothèque. Les demandes sont bornées à 50 nouveaux noms par
compte et par jour et ne consomment pas le quota des programmes.

## Déduplication et variantes

Une clé normalise accents, casse, espaces, apostrophes et tirets. Une contrainte
primaire assure une seule demande même entre plusieurs comptes ou requêtes
simultanées. Le matériel et les variantes ne sont jamais supprimés de la clé.
Des synonymes vérifiés peuvent être associés à la même fiche. La normalisation
ne prétend pas comprendre automatiquement que deux noms différents désignent
le même mouvement : vérifier les synonymes **avant chaque lot de génération**.
Les alias des fiches embarquées sont déjà enregistrés côté serveur.

## Traitement manuel d’un lot

Utiliser le skill imagegen dans Codex pour générer les illustrations demandées,
avec le style validé : contour anatomique noir, fond blanc, deux positions du
même mouvement et du même matériel. Aucune génération de lot n’est programmée.
L’exemple de développé couché n’est pas à régénérer : il existe déjà dans le catalogue.

L’outil administratif ci-dessous nécessite `SUPABASE_URL` et
`SUPABASE_SERVICE_ROLE_KEY` dans l’environnement **local de l’administrateur**.
Ne pas utiliser une variable `VITE_`, ne pas committer une clé, ni la coller dans
le chat. Il ne contient aucun appel OpenAI. Le SDK ne persiste pas de session.

```sh
node scripts/exercise-demo-library.mjs list
# Associer d’abord les demandes déjà couvertes à une fiche vérifiée :
node scripts/exercise-demo-library.mjs alias 'builtin:barbell-squat' 'synonyme vérifié'
# Après génération manuelle d’une seule planche contenant les deux positions :
node scripts/exercise-demo-library.mjs stage 'clé de la demande' /chemin/demo.png /chemin/guide.json
# Vérifier visuellement les deux positions, le matériel, la posture et le texte :
node scripts/exercise-demo-library.mjs approve 'clé de la demande' --reviewed
```

Le JSON du guide contient `title`, `steps` (au moins deux consignes en français)
et `mistake` (erreur à éviter). L’import conserve l’image dans un bucket privé et
crée un brouillon. Le téléchargement administratif du brouillon est possible via
Supabase Storage ; aucune URL de brouillon n’est renvoyée aux utilisateurs.
Seules les fiches approuvées sont servies par URL signée (une heure), avec un crédit
Vincere distinct d’Everkinetic. Le cache client expire après cinq minutes.

Un import répété ne remplace jamais un fichier différent ; un import interrompu
peut reprendre avec les mêmes octets. Une fiche publiée est immuable. Une fiche
rejetée reste enregistrée et ne déclenche aucune nouvelle génération. Un alias
peut réutiliser une autre fiche approuvée après vérification.

## Déploiement et vérification

Appliquer la migration `exercise_demo_library`, puis déployer la fonction
`exercise-demo` (contrôle JWT dans la fonction avec `auth.getUser()`).
Les RPC et tables internes sont réservés au rôle serveur ; aucun accès direct
aux brouillons ou privilège administratif n’est accordé aux comptes de l’app.
Aucune configuration de fournisseur d’images et aucun cron ne sont nécessaires.

Les tests utilisent des fixtures et une base Postgres PGlite locale : aucun
appel IA ni création réelle de programme n’est nécessaire.
