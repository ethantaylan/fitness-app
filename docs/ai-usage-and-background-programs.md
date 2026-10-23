# Quotas et création de programme en arrière-plan

Le serveur limite chaque compte à **5 demandes de création de programme par semaine**, du lundi à 00 h au lundi suivant, heure de Paris. Les séances, remplacements et messages de l'assistant partagent un plafond de **10 actions par jour**. Ces valeurs se trouvent dans `ai_private.limits`, sans dépendre du client ni de métadonnées utilisateur modifiables.

Une demande démarrée réserve une utilisation, y compris si le fournisseur échoue ensuite : elle a pu consommer des crédits. Reprendre son suivi, réouvrir l'app ou renvoyer son identifiant ne réserve aucune utilisation supplémentaire. Deux appareils retrouvent le même travail actif. Les validations d'entrée précèdent la réservation.

## Fonctionnement

`program-start` enregistre un travail et répond immédiatement. `program-status` ne fait que lire son état. Un worker effectue **un seul appel au modèle par étape**, puis sauvegarde la progression. Les lots trop longs sont divisés dans le travail restant. Les semaines et les séances déjà acceptées sont conservées.

La limite HTTP hébergée de Supabase est de 150 secondes ; augmenter le timeout du navigateur ne permet pas de la dépasser. Chaque étape borne son appel fournisseur à 105 secondes et son bail à 130 secondes. Le travail complet dispose de 30 minutes. Un ordonnanceur en base reprend les travaux dont le worker a été interrompu ; trois interruptions successives d'une même étape arrêtent la demande. Aucun de ces échecs ne désactive l'ancien programme.

La sauvegarde du nouveau programme et le passage du travail à `completed` sont atomiques. L'app retrouve la demande après rechargement et utilise le même identifiant pour son éventuelle sauvegarde de reprise.

Les endpoints de comptabilité et de travail ne sont exécutables que par `service_role`. Les données internes sont dans un schéma non exposé. Le worker HTTP est protégé par un secret dédié, qui ne permet ni de créer une demande ni de modifier un quota. L'assistant IA demande désormais une connexion pour empêcher un contournement anonyme du quota.

## Activation serveur

1. Appliquer les migrations `20261023141109_ai_usage_and_program_jobs.sql`, `20261023141118_program_job_dispatch.sql`, `20261023142015_background_worker_table_grants.sql` et `20261023142526_ai_job_auth_cascade.sql`.
2. Générer un secret aléatoire d'au moins 32 octets et le définir comme secret Edge `AI_WORKER_SECRET`.
3. Enregistrer dans Supabase Vault `ai_worker_secret` avec cette même valeur, et `ai_worker_url` avec l'URL HTTPS du projet suivie de `/functions/v1/ai-coach`. Ne pas utiliser une clé d'administration comme secret de worker et ne pas committer la valeur.
4. Déployer `ai-coach`. Vérifier la présence du cron `vincere-program-jobs` et des deux noms Vault, sans afficher les secrets.
5. Publier le client web et une nouvelle build iOS. Les anciens clients restent compatibles avec l'action synchrone `program`, soumise au même quota, mais seul le nouveau client utilise le suivi par étapes.

Le cron ne déclenche des appels que s'il existe des travaux en attente. Aucun e-mail de fin n'est activé : cette fonctionnalité a été reportée.

## Vérification sans crédits

`vp check`, `vp test --run`, `vp run build`, puis les scénarios `e2e/program-recovery.spec.ts` et `e2e/native-auth.spec.ts` sur Chromium et WebKit. Les tests utilisent PostgreSQL embarqué et des réponses IA fictives. Ne pas relancer le script de création réelle dans `artifacts/`.

Sources : [limites Supabase](https://supabase.com/docs/guides/functions/limits), [tâches en arrière-plan](https://supabase.com/docs/guides/functions/background-tasks), [ordonnancement](https://supabase.com/docs/guides/functions/schedule-functions).

## État vérifié le 23 octobre 2026

Les quatre migrations, le secret de worker et ses entrées Vault sont installés sur le projet Supabase. `ai-coach` v17 est actif et le cron est activé. La publication du client web/iOS reste nécessaire pour utiliser le nouveau suivi. Aucun appel OpenAI supplémentaire n’a été effectué pour ces vérifications.

Les données de quota et de travail référencent aussi directement le compte Auth : sa suppression efface ces nouvelles données même sur un ancien schéma dont le profil public ne suit pas encore cette suppression.
