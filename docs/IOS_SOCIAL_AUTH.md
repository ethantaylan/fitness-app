# Connexion sociale iOS

Les écrans de connexion et d’inscription affichent Apple puis Google sur iOS, avant l’e-mail. Le web conserve Google et l’e-mail : Apple web nécessiterait un Services ID et un secret OAuth distincts.

## Configuration

- App ID : `app.vincere.fitness`, équipe `248X772XW6`.
- Capacité Sign In with Apple activée sur l’identifiant Apple Developer.
- Entitlement `com.apple.developer.applesignin = [Default]` dans les configurations Debug et Release.
- Fournisseur Apple Supabase activé, Client IDs : `app.vincere.fitness`. Aucun secret OAuth requis pour ce parcours Apple natif.
- Fournisseur Google Supabase existant conservé.
- Retour natif autorisé dans Supabase : `app.vincere.fitness://auth/callback**`.

## Parcours

`NativeSignIn.swift` est un plugin local enregistré par `VincereViewController`, créé par le SceneDelegate et le storyboard. Il utilise AuthenticationServices, sans SDK tiers supplémentaire.

Apple ouvre la feuille iOS. Le client génère un nonce aléatoire, transmet son SHA-256 à Apple puis le nonce original à `signInWithIdToken`. L’état retourné est vérifié dans Swift et JavaScript. Seul l’e-mail est demandé ; le pseudo est recueilli par la configuration initiale du profil.

Google utilise le fournisseur web déjà configuré, ouvert dans `ASWebAuthenticationSession`. Le retour est limité au schéma de l’app et validé avec le même parseur que les autres liens natifs. Le code PKCE est échangé par Supabase ; le garde partagé empêche un double échange si le même retour arrive aussi par le cycle de vie iOS.

Les annulations restaurent le formulaire sans message d’échec. Aucun jeton d’identité n’est journalisé par le code applicatif ni conservé séparément de la session Supabase. Les comptes et les profils restent gérés par l’authentification existante ; aucune fusion manuelle de comptes n’est effectuée. L’adresse masquée Apple peut correspondre à un compte différent d’un compte Google existant.

## Vérifications

- Tests unitaires : nonce, état Apple incorrect, échange PKCE, duplication, annulation et conservation du parcours Google web.
- Tests Playwright : interface iOS simulée, session Apple/Google simulée, annulation et régression des liens de réinitialisation.
- Compilation iOS simulateur et archive signée.
- Les réponses des fournisseurs sont simulées dans les tests : une validation avec un véritable compte Apple/Google sur iPhone reste nécessaire.

Sur iPhone : tester Apple (adresse réelle puis masquée), Google, annulation, relance de l’app après connexion, déconnexion/reconnexion et retour vers le profil ou le programme attendu. Ne pas déclencher de génération payante pour valider ces connexions.

La build 12 reste la version soumise à la vérification App Store. La build 13 ajoute les connexions sociales pour les tests TestFlight ; son envoi ne remplace pas automatiquement la soumission de la build 12.
