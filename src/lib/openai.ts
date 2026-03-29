import OpenAI from "openai";
import type { UserProfile, Program, DailySession, Exercise } from "./types";
import { getAgentSystemPrompt, OBJECTIVE_LABELS, SUPPORT_AGENT_PROMPT } from "./agents";

function getClient(): OpenAI {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (!apiKey) throw new Error("VITE_OPENAI_API_KEY non définie dans .env");
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

function buildProfileDescription(profile: UserProfile): string {
  return `
PROFIL UTILISATEUR :
- Genre : ${profile.gender}
- Âge : ${profile.age} ans
- Taille : ${profile.height} cm
- Poids : ${profile.weight} kg
- Niveau sportif : ${profile.level}
- Objectif principal : ${OBJECTIVE_LABELS[profile.objective] ?? profile.objective}
- Fréquence souhaitée : ${profile.weeklyFrequency} séances/semaine
- Durée des séances : ${profile.sessionDuration.join(" ou ")} minutes
- Matériel disponible : ${profile.equipment.length ? profile.equipment.join(", ") : "aucun matériel spécifique"}
- Exercices préférés : ${profile.likedExercises.length ? profile.likedExercises.join(", ") : "aucune préférence"}
- Exercices à éviter : ${profile.dislikedExercises.length ? profile.dislikedExercises.join(", ") : "aucun"}
- Blessures / limitations : ${profile.injuries || "aucune"}
- Restrictions alimentaires : ${profile.nutritionRestrictions || "aucune"}
- Disponibilité horaire : ${profile.availability.join(", ")}
${profile.targetWeight ? `- Poids cible : ${profile.targetWeight} kg` : ""}
${profile.targetDate ? "- Date cible : " + profile.targetDate : ""}`.trim();
}

/** Minimum total exercises required for a session based on its duration */
function minExercisesForDuration(durationMin: number): number {
  if (durationMin <= 35) return 3;
  if (durationMin <= 50) return 5;
  if (durationMin <= 65) return 6;
  if (durationMin <= 80) return 8;
  return 10;
}

/** Count total exercises across all blocks of a session */
function countSessionExercises(session: { blocks: { exercises: unknown[] }[] }): number {
  return session.blocks.reduce((sum, b) => sum + b.exercises.length, 0);
}

/** Validate that every session in the program meets the minimum exercise count */
function validateProgramVolume(program: Program): string | null {
  for (const week of program.weeks) {
    for (const session of week.sessions) {
      const total = countSessionExercises(session);
      const required = minExercisesForDuration(session.duration_min);
      if (total < required) {
        return `Semaine ${week.week_number}, ${session.day} (${session.type}, ${session.duration_min} min) : seulement ${total} exercices générés, minimum requis ${required}.`;
      }
    }
  }
  return null;
}

const VOLUME_RULES = `
RÈGLES DE VOLUME ABSOLUMENT OBLIGATOIRES — NE PAS IGNORER :
Le non-respect de ces règles rend la réponse invalide.

Minimums d'exercices par séance selon la durée :
- ≤ 35 min → minimum 3 exercices au total
- 36–50 min → minimum 5 exercices au total
- 51–65 min → minimum 6 exercices au total
- 66–80 min → minimum 8 exercices au total
- > 80 min  → minimum 10 exercices au total

Règles par type de séance (OBLIGATOIRES) :
- Push (pectoraux / épaules / triceps) : minimum 5 exercices — ex: développé couché, développé incliné, écarté haltères, développé militaire, élévations latérales, dips, extensions triceps
- Pull (dos / biceps) : minimum 5 exercices — ex: tractions, rowing barre, rowing haltères, tirage poulie haute, curl biceps, curl concentré, face pull
- Legs (quadriceps / ischio / mollets) : minimum 5 exercices — ex: squat, presse, fente, leg curl, leg extension, mollets debout, hip thrust
- Full Body : minimum 8 exercices répartis en au minimum 2 blocs
- Cardio / HIIT : minimum 5 stations / exercices
- Upper Body : minimum 6 exercices
- Lower Body : minimum 5 exercices

Chaque bloc doit contenir MINIMUM 3 exercices — JAMAIS 1 ou 2 seuls.
La valeur duration_min doit être calculée en fonction du contenu réel (sets × tempo + repos + échauffement + récupération), PAS inventée arbitrairement.
`;

const SPORT_COHERENCE_RULES = `
COHÉRENCE SPORTIVE — RÈGLE ABSOLUE :
La séance doit être 100 % cohérente avec l'objectif sportif de l'utilisateur.
Tu NE PEUX PAS mélanger des exercices de disciplines différentes pour atteindre un minimum de volume.

Exemples stricts :
- Running / trail → UNIQUEMENT : intervalles, fractionné, côtes, sortie longue, travail de cadence, plyométrie course (foulées bondissantes, montées de genoux), renforcement SPÉCIFIQUE course (gainage, mollets, fessiers, ischio, hanches). JAMAIS de développé couché, tirage poulie, curl biceps ou exercices de salle non liés à la course.
- Yoga → UNIQUEMENT : postures, flows, respirations, mobilité, étirements. JAMAIS d'haltères ou barres.
- CrossFit → WODs fonctionnels (gymnastics, haltérophilie olympique, conditionnement). Cohérent CrossFit uniquement.
- HYROX → Stations HYROX + course. Pas de séance push/pull de bodybuilding.
- Natation → exercices aquatiques et renforcement postural nageur uniquement.
- Prise de masse / Musculation → salle de sport, charges libres, machines. Pas de séance running.

Si l'objectif est un sport d'endurance (running, yoga, hyrox), le renforcement musculaire complémentaire doit être SPÉCIFIQUE à ce sport (ex: gainage pour running, pas développé couché).
Atteindre le minimum de volume DOIT se faire avec des exercices cohérents avec le sport — jamais avec des exercices d'une autre discipline.
`;

const PROGRAM_JSON_SCHEMA = `{
  "program_overview": {
    "duration_weeks": number,
    "training_days_per_week": number,
    "summary": "string (résumé en 2-3 phrases motivantes)"
  },
  "weeks": [
    {
      "week_number": number,
      "focus": "string (ex: Adaptation, Progression, Intensification, Déload)",
      "sessions": [
        {
          "day": "string (ex: Lundi)",
          "session_id": "string (ex: W1D1)",
          "type": "string (ex: Full Body, Push, Pull, Cardio HIIT)",
          "duration_min": number,
          "intensity": "string (Légère / Modérée / Intense)",
          "warmup": [{"name": "string", "duration_sec": number}],
          "blocks": [
            {
              "block_name": "string",
              "exercises": [
                {
                  "name": "string",
                  "sets": number,
                  "reps": "string (ex: 12 ou 10-12 ou 45 sec)",
                  "load_kg": "string (ex: 20-25 kg ou Poids du corps ou RPE 7)",
                  "tempo": "string (ex: 2-0-2)",
                  "rest_sec": number,
                  "alternative": "string (exercice alternatif si douleur)",
                  "notes": "string (conseil technique court)"
                }
              ]
            }
          ],
          "cooldown": [{"name": "string", "duration_sec": number}],
          "notes": "string (conseil du jour)"
        }
      ]
    }
  ],
  "nutrition_recommendations": {
    "daily_calories_estimate": number,
    "protein_target_g": number,
    "water_intake_l": number,
    "notes": "string (conseils généraux non médicaux)"
  },
  "general_advice": "string (conseils globaux du coach)",
  "legal_disclaimer": "string"
}`;

function buildDurationInstruction(profile: UserProfile): string {
  if (profile.targetDate) {
    const today = new Date();
    const target = new Date(profile.targetDate);
    const diffMs = target.getTime() - today.getTime();
    const diffWeeks = Math.max(1, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)));
    return `Le programme doit durer EXACTEMENT ${diffWeeks} semaine${diffWeeks > 1 ? "s" : ""} (date cible : ${profile.targetDate}).`;
  }
  return `L'utilisateur n'a pas fixé d'échéance. Détermine toi-même la durée optimale selon son niveau et son objectif (entre 4 et 16 semaines). Ne te limite pas à 4 semaines par défaut.`;
}

function buildTargetPaceInstruction(profile: UserProfile): string {
  if (!profile.targetWeight || !profile.targetDate) return "";

  const diffKg = profile.targetWeight - profile.weight;
  if (Math.abs(diffKg) < 0.1) return "";

  const today = new Date();
  const target = new Date(profile.targetDate);
  const diffMs = target.getTime() - today.getTime();
  const diffWeeks = Math.max(1, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)));
  const weeklyChange = Math.abs(diffKg) / diffWeeks;
  const direction = diffKg < 0 ? "perte" : "prise";

  return `Le poids cible implique une ${direction} moyenne d'environ ${weeklyChange.toFixed(2)} kg/semaine. Le programme doit rester progressif, prudent et réaliste : ne promets jamais une transformation extrême ou malsaine.`;
}

export async function generateProgram(profile: UserProfile): Promise<Program> {
  const client = getClient();

  const buildMessages = () => [
    { role: "system" as const, content: getAgentSystemPrompt(profile.objective) },
    {
      role: "user" as const,
      content: `Génère un programme sportif complet pour ce profil.

${buildProfileDescription(profile)}

${buildDurationInstruction(profile)}

${buildTargetPaceInstruction(profile)}

${VOLUME_RULES}

Retourne UNIQUEMENT un JSON valide respectant exactement ce schéma (sans markdown) :
${PROGRAM_JSON_SCHEMA}

Important : génère ${profile.weeklyFrequency} séances par semaine. Assure une progression logique semaine après semaine.`,
    },
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: buildMessages(),
      response_format: { type: "json_object" },
      temperature: attempt === 0 ? 0.5 : 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("Pas de réponse de l'IA");

    const parsed = JSON.parse(content) as Program;
    const error = validateProgramVolume(parsed);

    if (!error) return { ...parsed, user_profile: profile };

    if (attempt === 2) {
      // Last attempt: return anyway to not block the user
      console.warn("Programme généré avec volume insuffisant après 3 tentatives:", error);
      return { ...parsed, user_profile: profile };
    }
  }

  throw new Error("Impossible de générer un programme valide");
}

export async function generateDailySession(
  profile: UserProfile,
  previousFeedback?: "good" | "normal" | "hard",
): Promise<DailySession> {
  const client = getClient();
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  let feedbackMessage = "Séance normale, maintenir le niveau";
  if (previousFeedback === "good") {
    feedbackMessage = "Séance bien passée, peut augmenter légèrement l'intensité";
  } else if (previousFeedback === "hard") {
    feedbackMessage = "Séance trop difficile, réduire intensité et charges";
  }
  const feedbackContext = previousFeedback ? `\nFEEDBACK DERNIÈRE SÉANCE : ${feedbackMessage}` : "";

  const buildMessages = () => [
    { role: "system" as const, content: getAgentSystemPrompt(profile.objective) },
    {
      role: "user" as const,
      content: `Génère la séance d'entraînement du jour (${today}) pour cet utilisateur.

${buildProfileDescription(profile)}
${feedbackContext}

${SPORT_COHERENCE_RULES}

${VOLUME_RULES}

La durée cible est ${profile.sessionDuration[0]} min — génère en conséquence le bon nombre d'exercices selon le barème ci-dessus.

Retourne UNIQUEMENT un JSON valide :
{
  "date": "${today}",
  "intensity": "string",
  "goal": "string",
  "duration_min": number,
  "warmup": [{"name": "string", "duration_sec": number}],
  "blocks": [
    {
      "block_name": "string",
      "exercises": [
        {
          "name": "string",
          "sets": number,
          "reps": "string",
          "load_kg": "string",
          "alternative": "string",
          "notes": "string"
        }
      ]
    }
  ],
  "cooldown": [{"name": "string", "duration_sec": number}],
  "motivation_message": "string (message motivant et blagueur du coach, 1-2 phrases)"
}`,
    },
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: buildMessages(),
      response_format: { type: "json_object" },
      temperature: attempt === 0 ? 0.5 : 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("Pas de réponse de l'IA");

    const parsed = JSON.parse(content) as DailySession;
    const total = countSessionExercises(parsed);
    const required = minExercisesForDuration(profile.sessionDuration[0]);

    if (total >= required) return parsed;

    if (attempt === 2) {
      console.warn(
        `Séance générée avec seulement ${total} exercices (requis: ${required}) après 3 tentatives`,
      );
      return parsed;
    }
  }

  throw new Error("Impossible de générer une séance valide");
}

type SupportMessage = { role: "user" | "assistant"; content: string };

export async function generateCustomSession(
  profile: UserProfile,
  selections: Array<{ id: string; label: string; count: number; minutesPerItem: number }>,
  estimatedDuration: number,
): Promise<DailySession> {
  const client = getClient();
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const selectionDesc = selections
    .map((s) => `- ${s.label} : ${s.count} exercice${s.count > 1 ? "s" : ""}`)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system" as const, content: getAgentSystemPrompt(profile.objective) },
      {
        role: "user" as const,
        content: `Génère une séance sur-mesure basée EXACTEMENT sur la sélection suivante :

${selectionDesc}

${buildProfileDescription(profile)}

RÈGLES ABSOLUES :
1. Pour chaque ligne ci-dessus, génère EXACTEMENT le nombre d'exercices indiqué ciblant ce groupe musculaire / type d'effort. Pas un de plus, pas un de moins.
2. Regroupe les exercices par affinité dans des blocs logiques (ex: tous les abdos ensemble, jambes ensemble).
3. La séance totale doit durer environ ${estimatedDuration} minutes — calcule le duration_min réel.
4. Adapte au niveau (${profile.level}) et au matériel disponible (${profile.equipment.join(", ") || "poids du corps"}).
5. Inclus un échauffement et une récupération adaptés au contenu.

Retourne UNIQUEMENT un JSON valide :
{
  "date": "${today}",
  "intensity": "string",
  "goal": "string",
  "duration_min": number,
  "warmup": [{"name": "string", "duration_sec": number}],
  "blocks": [
    {
      "block_name": "string",
      "exercises": [
        {
          "name": "string",
          "sets": number,
          "reps": "string",
          "load_kg": "string",
          "alternative": "string",
          "notes": "string"
        }
      ]
    }
  ],
  "cooldown": [{"name": "string", "duration_sec": number}],
  "motivation_message": "string"
}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Pas de réponse de l'IA");
  return JSON.parse(content) as DailySession;
}

export async function replaceExercise(
  exercise: Exercise,
  context: {
    blockName: string;
    sessionGoal: string;
    profile: UserProfile;
  },
): Promise<Exercise> {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: getAgentSystemPrompt(context.profile.objective) },
      {
        role: "user",
        content: `Remplace cet exercice par un exercice équivalent.

EXERCICE À REMPLACER : ${exercise.name}
BLOC : ${context.blockName}
OBJECTIF DE LA SÉANCE : ${context.sessionGoal}
${buildProfileDescription(context.profile)}

RÈGLES :
- Cible les mêmes groupes musculaires principaux
- Respecte le matériel disponible de l'utilisateur
- Ne propose PAS "${exercise.name}" ni un exercice très similaire
- Conserve des séries/reps cohérentes avec le bloc
- Adapte la charge si nécessaire

Retourne UNIQUEMENT un JSON valide (sans markdown, sans \`\`\`) :
{
  "name": "string",
  "sets": number,
  "reps": "string",
  "load_kg": "string",
  "rest_sec": number,
  "alternative": "string",
  "notes": "string"
}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Pas de réponse de l'IA");
  return JSON.parse(content) as Exercise;
}

export async function chatWithSupport(messages: SupportMessage[]): Promise<string> {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: SUPPORT_AGENT_PROMPT }, ...messages],
    temperature: 0.7,
    max_tokens: 300,
  });
  return completion.choices[0]?.message?.content ?? "Je n'ai pas pu générer une réponse.";
}
