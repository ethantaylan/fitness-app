# Santé et suivi libre des programmes

Les séances se font dans l’ordre choisi au sein de la semaine. La semaine active est la première
qui contient une séance non réalisée, indépendamment de la date du programme. Les semaines suivantes
restent consultables ; leur validation est bloquée dans l’interface et dans Postgres jusqu’à ce que
les précédentes soient terminées. Recommencer une semaine conserve ses exercices et peut réinitialiser
les suivantes. Aucune génération IA n’est déclenchée.

## Apple Santé / Apple Watch

Dans Profil → Compte → Santé et montres, l’utilisateur demande l’accès aux entraînements.
Le plugin Capacitor `VincereHealth` lit uniquement `HKWorkout`, sur les 60 derniers jours (200 maximum).
L’autorisation système ne prouve pas que la lecture est accordée : une liste vide peut signifier
absence d’activité ou accès refusé. Pas d’écriture Santé ni de synchronisation en arrière-plan.

L’utilisateur choisit une activité puis confirme la séance à valider. Le serveur vérifie le propriétaire,
la progression et les doublons. `health_activity_links` conserve l’identifiant externe, les dates et
la séance associée, sous RLS. Les détails d’activité restent en mémoire de l’écran et ne sont jamais
inclus dans les requêtes IA. Les associations sont incluses dans l’export du compte, supprimées en
décochant la séance, à la réinitialisation correspondante ou à la suppression du compte.

Avant distribution iOS : activer HealthKit pour `app.vincere.fitness` dans la signature Apple,
régénérer le profil si nécessaire, tester sur un iPhone réel l’autorisation acceptée/refusée/révoquée,
une activité, un doublon et une remise à zéro. Déclarer les dates/identifiants d’activité associés
au compte dans App Store Connect (données de forme physique, fonctionnalité de l’app, liées au compte,
sans suivi publicitaire). Le simulateur valide la compilation mais ne remplace pas ces essais.

## Garmin

L’accès Garmin Developer n’est pas encore obtenu. Le parcours disponible utilise Garmin Connect →
Apple Santé → Vincere, dans la limite des données que Garmin transmet. L’écran contient le guide Garmin.
Ce parcours n’installe aucune application sur la montre et n’envoie aucun programme à la montre.

La connexion directe nécessitera l’accès au programme Garmin Connect Developer, une application OAuth,
les autorisations choisies, des secrets serveur, les callbacks et notifications documentés par Garmin.
Ne pas activer une fausse connexion OAuth en attendant cet accès.

Sources officielles :

- https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data
- https://support.garmin.com/en-US/?faq=lK5FPB9iPF5PXFkIpFlFPA
- https://developer.garmin.com/gc-developer-program/
