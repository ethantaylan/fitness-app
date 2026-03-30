export type ObjectiveType =
  | "perte-poids"
  | "prise-masse"
  | "entretien"
  | "competition"
  | "hyrox"
  | "crossfit"
  | "running"
  | "yoga"
  | "remise-en-forme";

export type LevelType = "débutant" | "intermédiaire" | "avancé";
export type GenderType = "homme" | "femme" | "autre";
export type AvailabilityType = "matin" | "midi" | "soir" | "indifférent";

export interface UserProfile {
  objective: ObjectiveType;
  gender: GenderType;
  age: number;
  height: number; // cm
  weight: number; // kg
  level: LevelType;
  equipment: string[];
  sessionDuration: number[]; // minutes
  weeklyFrequency: number;
  likedExercises: string[];
  dislikedExercises: string[];
  injuries: string;
  nutritionRestrictions: string;
  availability: AvailabilityType[];
  targetWeight?: number;
  targetDate?: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: number | string;
  load_kg?: string;
  tempo?: string;
  rest_sec?: number;
  alternative?: string;
  notes?: string;
}

export interface SessionBlock {
  block_name: string;
  exercises: Exercise[];
}

export interface WarmupItem {
  name: string;
  duration_sec?: number;
  reps?: number;
}

export interface Session {
  day: string;
  session_id: string;
  type: string;
  duration_min: number;
  intensity: string;
  warmup: WarmupItem[];
  blocks: SessionBlock[];
  cooldown: WarmupItem[];
  notes?: string;
  completed?: boolean;
  completedAt?: string | null;
}

export interface Week {
  week_number: number;
  focus: string;
  sessions: Session[];
}

export interface NutritionRecommendations {
  daily_calories_estimate: number;
  protein_target_g: number;
  water_intake_l: number;
  notes: string;
}

export interface Program {
  user_profile?: Partial<UserProfile>;
  program_overview: {
    duration_weeks: number;
    training_days_per_week: number;
    summary: string;
    agent_used?: string;
  };
  weeks: Week[];
  nutrition_recommendations?: NutritionRecommendations;
  general_advice?: string;
  legal_disclaimer?: string;
}

export interface DailySession {
  uid: string;
  date: string;
  intensity: string;
  goal: string;
  duration_min: number;
  warmup: WarmupItem[];
  blocks: SessionBlock[];
  cooldown: WarmupItem[];
  motivation_message: string;
  feedback?: "good" | "normal" | "hard";
}

export type RecordCategory = "force" | "cardio" | "corps" | "autre";

export interface PersonalRecord {
  id: string;
  name: string;
  category: RecordCategory;
  date: string;
  weight_kg?: number;
  reps?: number;
  distance_km?: number;
  time_min?: number;
  notes?: string;
}
