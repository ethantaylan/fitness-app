import OpenAI from "openai";
import type { UserProfile, Program, DailySession } from "./types";
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
${profile.targetDate ? `- Date cible : ${profile.targetDate}` : ""}`.trim();
}

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

export async function generateProgram(profile: UserProfile): Promise<Program> {
  const client = getClient();

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: getAgentSystemPrompt(profile.objective) },
      {
        role: "user",
        content: `Génère un programme sportif complet de 4 à 8 semaines pour ce profil.

${buildProfileDescription(profile)}

Retourne UNIQUEMENT un JSON valide respectant exactement ce schéma (sans markdown) :
${PROGRAM_JSON_SCHEMA}

Important : génère ${profile.weeklyFrequency} séances par semaine sur minimum 4 semaines. Assure une progression logique semaine après semaine.`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Pas de réponse de l'IA");
  const parsed = JSON.parse(content) as Program;
  return { ...parsed, user_profile: profile };
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

  const feedbackContext = previousFeedback
    ? `\nFEEDBACK DERNIÈRE SÉANCE : ${
        previousFeedback === "good"
          ? "Séance bien passée, peut augmenter légèrement l'intensité"
          : previousFeedback === "hard"
            ? "Séance trop difficile, réduire intensité et charges"
            : "Séance normale, maintenir le niveau"
      }`
    : "";

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: getAgentSystemPrompt(profile.objective) },
      {
        role: "user",
        content: `Génère la séance d'entraînement du jour (${today}) pour cet utilisateur.

${buildProfileDescription(profile)}
${feedbackContext}

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
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Pas de réponse de l'IA");
  return JSON.parse(content) as DailySession;
}

type SupportMessage = { role: "user" | "assistant"; content: string };

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
