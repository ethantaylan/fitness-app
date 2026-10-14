# Builder de séance libre — fonctionnalité masquée

Le builder de séance libre (création d'une séance ponctuelle hors programme) est **masqué pour le moment**.
Le code est entièrement conservé et sera **réactivé plus tard**. Ne rien supprimer.

Un seul drapeau pilote l'ensemble :

```ts
// src/lib/features.ts
export const FREE_SESSION_BUILDER_ENABLED = false;
```

## Ce qui est masqué quand le drapeau est à `false`

| Où                                             | Comportement masqué                                                                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/App.tsx`                                  | Les routes `/builder` **et `/session`** (onglet Séances) redirigent vers `/dashboard`.                                                    |
| `src/components/BottomNav.tsx`, `Navbar.tsx`   | L'onglet « Séances » est retiré de la navigation (mobile : 4 onglets ; bureau : lien retiré).                                             |
| `src/pages/Dashboard.tsx`                      | Le bloc « Séance libre » de l'Accueil n'est plus rendu ; le lien `?bonus=1` ne mène plus au builder.                                      |
| `src/components/dashboard/FreeSessionCard.tsx` | Conservé tel quel, rendu seulement si le drapeau est à `true`.                                                                            |
| `src/pages/DailySession.tsx` (page Séances)    | Conservée ; inaccessible tant que la route est redirigée. Contient l'historique, le détail, les modèles rapides et le bouton de création. |
| `src/components/SupportChat.tsx`               | La suggestion « Comment créer une séance libre ? » est retirée.                                                                           |
| `src/lib/agents.ts` (`SUPPORT_AGENT_PROMPT`)   | L'assistant ne propose plus la création de séances libres (texte conditionné par le drapeau).                                             |
| `e2e/*.spec.ts`                                | Les parcours du builder sont ignorés tant que le drapeau est à `false`.                                                                   |

## Fichiers conservés (à ne pas supprimer)

- `src/pages/WorkoutBuilder.tsx` — l'écran (page plein écran avec retour, dock fixe, « Composer avec Vincere »,
  composition manuelle par zones musculaires / types d'effort / course à pied).
- `src/lib/quickWorkouts.ts` — minutes par activité, estimation de durée, modèles rapides.
- `src/components/ui/PageHeader.tsx` — en-tête plein écran avec bouton Retour (aussi utilisé par l'écran de séance du programme).
- `src/lib/openai.ts` → `generateCustomSession`, `generateDailySession` ; `supabase/functions/ai-coach/index.ts`
  → actions `custom-session` et `daily-session` (fonction `customSessionSystemPrompt`).
- `.app-dock` dans `src/index.css` (barre fixe au-dessus de la navigation).

## Règles produit à conserver à la réactivation

- **Choix totalement libre.** Le builder ne se base ni sur la discipline du profil ni sur le programme :
  toutes les activités (zones musculaires, types d'effort, course à pied) sont proposées à tout le monde,
  y compris les modèles rapides. Un profil yoga peut travailler les pectoraux.
- Côté serveur, la composition manuelle (`custom-session`) utilise un coach généraliste
  (`customSessionSystemPrompt`) : aucune règle propre à une discipline ne peut refuser une activité choisie.
  Seul « Composer avec Vincere » (`daily-session`) reste guidé par le profil et le programme.
- Page plein écran avec bouton **Retour** visible ; CTA « Composer avec Vincere » dans un dock fixe au-dessus de la navigation.

## Réactiver

1. Passer `FREE_SESSION_BUILDER_ENABLED` à `true` dans `src/lib/features.ts`.
2. Vérifier les points du tableau ci-dessus (Accueil, onglet Séances dans les deux navigations, routes `/builder` et `/session`, assistant).
3. Lancer `vp check`, `vp test` et `vp exec playwright test` (les parcours du builder se réactivent seuls).

## Prompt de réactivation

À copier-coller tel quel dans Claude Code :

```text
Réactive la fonctionnalité « builder de séance libre » de Vincere, aujourd'hui masquée.

Contexte : le drapeau FREE_SESSION_BUILDER_ENABLED (src/lib/features.ts) est à false. Le code du builder
est conservé (src/pages/WorkoutBuilder.tsx, src/lib/quickWorkouts.ts, src/components/ui/PageHeader.tsx,
actions custom-session / daily-session dans supabase/functions/ai-coach/index.ts). La liste de tout ce qui
est masqué est dans docs/free-session-builder/README.md.

À faire :
1. Passe FREE_SESSION_BUILDER_ENABLED à true et vérifie chaque point listé dans le README :
   route /builder, bloc « Séance libre » de l'Accueil, bouton « Créer une séance libre » et modèles
   rapides de l'onglet Séances, suggestion de l'assistant, prompt SUPPORT_AGENT_PROMPT.
2. Garde les règles produit : choix totalement libre (toutes les activités pour tous les profils, aucune
   restriction liée à la discipline ou au programme), page plein écran avec bouton Retour, dock fixe
   « Composer avec Vincere » au-dessus de la navigation, tutoiement partout.
3. Vérifie que la fonction Edge ai-coach est déployée avec customSessionSystemPrompt (composition manuelle
   sans règle de discipline) et que « Composer avec Vincere » tient toujours compte du profil et du programme.
4. Corrige ce qui a dérivé depuis le masquage (textes, composants, types), sans changer la logique métier.
5. Lance vp check, vp test et les tests Playwright ; vérifie à 375, 567, 768 et 1280 px en clair et en
   sombre : zones tactiles ≥ 44 px, texte ≥ 11 px, contraste ≥ 4,5:1, aucun élément masqué par le dock ou la navigation.
Donne un récapitulatif des fichiers modifiés et de ce que tu n'as pas pu vérifier.
```
