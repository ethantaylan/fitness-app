# APEX - Coach sportif IA personnalise

APEX est une application web progressive (PWA) qui genere des **programmes d'entrainement** et des **seances quotidiennes** sur mesure grace a l'IA. Elle s'adapte a ton niveau, tes objectifs, ton equipement disponible et ton historique de feedback.

---

## Fonctionnalites

| Feature                        | Description                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Generation IA de seances**   | GPT-4o genere une seance complete (echauffement, blocs, cooldown, message motivation) adaptee a ton profil |
| **Programme multi-semaines**   | Creation d'un plan d'entrainement structure sur plusieurs semaines avec progression                        |
| **WorkoutBuilder**             | Construis ta propre seance en selectionnant les zones musculaires a travailler                             |
| **Feedback adaptatif**         | Ton ressenti (bien passe / normal / trop dur) ajuste les prochaines seances                                |
| **Export PDF**                 | Telecharge ton programme complet en PDF                                                                    |
| **Historique de seances**      | Consulte toutes tes seances passees avec detail complet                                                    |
| **Authentification securisee** | Inscription, connexion, reinitialisation de mot de passe via Supabase Auth                                 |
| **Profil personnalise**        | Objectif, niveau, frequence, equipement, age, poids, taille, historique sportif                            |

---

## Stack technique

```
React 19 + TypeScript 5          - UI
Vite+ (vp)                       - Toolchain (build, dev, lint, test)
Tailwind CSS v4 + DaisyUI v5     - Styling
React Router v6                  - Navigation
Supabase                         - Auth + PostgreSQL
OpenAI API (GPT-4o)              - Generation IA
jsPDF / html2canvas              - Export PDF
Netlify                          - Hebergement + SPA redirects
```

---

## Prerequis

- **Node.js** 20+ (gere par `vp env`)
- **pnpm** 10+ (ou utilise `vp install`)
- Compte **Supabase** (gratuit)
- Cle API **OpenAI**

---

## Installation locale

```bash
# Cloner le repo
git clone https://github.com/TON_USER/APEX.git
cd APEX

# Installer les dependances
vp install

# Copier les variables d'environnement
cp .env.example .env.local
```

Renseigne `.env.local` :

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_OPENAI_API_KEY=sk-...
```

```bash
# Demarrer le serveur de developpement
vp dev
```

---

## Base de donnees

Execute le script SQL dans ton projet Supabase (SQL Editor) :

```bash
cat schema.sql
```

Le schema cree :

- Table `users` (profil utilisateur)
- Row Level Security (RLS)
- Fonction `upsert_user` avec `SECURITY DEFINER`
- Grants pour le role `authenticated`

---

## Scripts disponibles

| Commande         | Description                       |
| ---------------- | --------------------------------- |
| `vp dev`         | Serveur de developpement avec HMR |
| `vp build`       | Build de production               |
| `vp preview`     | Preview du build de production    |
| `vp check`       | Format + lint + TypeScript        |
| `vp check --fix` | Auto-corrige le formatage         |
| `vp test`        | Tests unitaires via Vitest        |

---

## Architecture

```
src/
+-- components/
|   +-- dashboard/
|   |   +-- ProgramSection.tsx   # Bloc programme
|   |   +-- TodayCard.tsx        # Seance du jour
|   +-- ui/
|   |   +-- Section.tsx          # Section reusable
|   +-- BottomNav.tsx            # Navigation mobile
|   +-- SessionPickerSheet.tsx   # Modal generation seance
|   +-- ProtectedRoute.tsx       # Guard d'auth
+-- lib/
|   +-- constants.ts     # Source unique de verite (metas, enums)
|   +-- openai.ts        # Appels GPT-4o
|   +-- db.ts            # Operations Supabase
|   +-- store.tsx        # Etat global (Context + reducer)
|   +-- types.ts         # Types TypeScript
+-- pages/
    +-- Dashboard.tsx    # Tableau de bord
    +-- DailySession.tsx # Hub seances (liste + detail)
    +-- WorkoutBuilder.tsx # Constructeur manuel
    +-- Onboarding.tsx   # Configuration profil (multi-etapes)
    +-- Settings.tsx     # Parametres
    +-- ProgramResult.tsx # Resultat programme
    +-- Landing.tsx      # Page d'accueil publique
```

---

## Flux utilisateur

```
Landing -> Register/Login -> Onboarding -> Dashboard
  +-- Generer seance IA -> SessionPickerSheet -> DailySession
  +-- WorkoutBuilder -> selection zones -> seance custom
  +-- Generer programme -> Generating -> ProgramResult (PDF)
```

---

## Variables d'environnement

| Variable                 | Requis |
| ------------------------ | ------ |
| `VITE_SUPABASE_URL`      | Oui    |
| `VITE_SUPABASE_ANON_KEY` | Oui    |
| `VITE_OPENAI_API_KEY`    | Oui    |

---

## Deploiement Netlify

1. Connecte le repo GitHub a Netlify
2. Build command : `vp build`
3. Publish directory : `dist`
4. Ajoute les variables d'env dans les settings Netlify
5. Le fichier `public/_redirects` gere le routage SPA

---

## Objectifs sportifs

| Code              | Description                  |
| ----------------- | ---------------------------- |
| `perte-poids`     | Cardio + deficit calorique   |
| `prise-masse`     | Hypertrophie et force        |
| `entretien`       | Maintien forme generale      |
| `competition`     | Preparation competition      |
| `hyrox`           | Hyrox (fonctionnel + cardio) |
| `crossfit`        | WOD CrossFit                 |
| `running`         | Plans de course              |
| `yoga`            | Flexibilite et mobilite      |
| `remise-en-forme` | Reprise progressive          |

---

## Licence

MIT
