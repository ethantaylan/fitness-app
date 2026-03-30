import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { OBJECTIVE_LABELS } from "./agents";
import { LEVEL_META } from "./constants";
import type { Program, Session, SessionBlock, UserProfile, WarmupItem, Week } from "./types";

const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatLoad(loadKg?: string): string {
  if (!loadKg) return "-";
  return /^\d/.test(loadKg) ? `${loadKg} kg` : loadKg;
}

function formatWarmupItems(items: WarmupItem[]) {
  return items
    .map((item) => {
      const detail = item.duration_sec
        ? `${item.duration_sec}s`
        : item.reps
          ? `${item.reps} reps`
          : "";
      return `<span class="tag">${escapeHtml(item.name)}${detail ? ` · ${escapeHtml(detail)}` : ""}</span>`;
    })
    .join("");
}

function renderBlock(block: SessionBlock) {
  return `
    <div class="block">
      <div class="block-title">${escapeHtml(block.block_name)}</div>
      <table>
        <thead>
          <tr>
            <th>Exercice</th>
            <th>Series</th>
            <th>Reps</th>
            <th>Charge</th>
            <th>Repos</th>
          </tr>
        </thead>
        <tbody>
          ${block.exercises
            .map(
              (exercise) => `
                <tr>
                  <td>
                    <span class="exercise-name">${escapeHtml(exercise.name)}</span>
                    ${exercise.notes ? `<span class="exercise-detail">${escapeHtml(exercise.notes)}</span>` : ""}
                    ${exercise.alternative ? `<span class="exercise-detail">Alternative: ${escapeHtml(exercise.alternative)}</span>` : ""}
                  </td>
                  <td>${escapeHtml(exercise.sets)}</td>
                  <td>${escapeHtml(exercise.reps)}</td>
                  <td>${escapeHtml(formatLoad(exercise.load_kg))}</td>
                  <td>${exercise.rest_sec ? `${escapeHtml(exercise.rest_sec)}s` : "-"}</td>
                </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSession(session: Session) {
  return `
    <div class="session-card">
      <div class="session-header">
        <div>
          <div class="session-title">${escapeHtml(session.day)} · ${escapeHtml(session.type)}</div>
          <div class="session-meta">
            <span class="pill">${escapeHtml(session.session_id)}</span>
            <span class="pill">${escapeHtml(session.duration_min)} min</span>
            <span class="pill">${escapeHtml(session.intensity)}</span>
          </div>
        </div>
      </div>

      ${
        session.warmup?.length > 0
          ? `
            <div class="subsection">
              <div class="subsection-title">Echauffement</div>
              <div class="tag-list">${formatWarmupItems(session.warmup)}</div>
            </div>
          `
          : ""
      }

      ${session.blocks.map((block) => renderBlock(block)).join("")}

      ${
        session.cooldown?.length > 0
          ? `
            <div class="subsection">
              <div class="subsection-title">Recuperation</div>
              <div class="tag-list">${formatWarmupItems(session.cooldown)}</div>
            </div>
          `
          : ""
      }

      ${session.notes ? `<div class="note-box">${escapeHtml(session.notes)}</div>` : ""}
    </div>
  `;
}

function renderMetricCards(metrics: Array<{ label: string; value: string }>) {
  return `
    <div class="metric-grid">
      ${metrics
        .map(
          (metric) => `
            <div class="metric-card">
              <div class="metric-label">${escapeHtml(metric.label)}</div>
              <div class="metric-value">${escapeHtml(metric.value)}</div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function buildCoverPage(program: Program) {
  const { program_overview, user_profile } = program;

  const metrics = [
    {
      label: "Discipline",
      value: user_profile?.objective ? OBJECTIVE_LABELS[user_profile.objective] : "-",
    },
    { label: "Duree", value: `${program_overview.duration_weeks} semaines` },
    { label: "Frequence", value: `${program_overview.training_days_per_week} x / semaine` },
    {
      label: "Niveau",
      value: user_profile?.level ? LEVEL_META[user_profile.level].label : "-",
    },
  ];

  return `
    <div class="page-root">
      <div class="page-header">
        <div class="eyebrow">Vincere</div>
        <h1 class="page-title">Programme d'entrainement personnalise</h1>
        <p class="page-subtitle">Genere le ${escapeHtml(new Date().toLocaleDateString("fr-FR"))}</p>
      </div>

      <div class="hero-card">
        <div class="hero-label">Vue d'ensemble</div>
        <p class="hero-summary">${escapeHtml(program_overview.summary)}</p>
        ${renderMetricCards(metrics)}
      </div>
    </div>
  `;
}

function buildProfilePage(profile?: Partial<UserProfile>) {
  if (!profile) return "";

  const metrics = [
    profile.objective && {
      label: "Objectif",
      value: OBJECTIVE_LABELS[profile.objective] ?? profile.objective,
    },
    profile.level && { label: "Niveau", value: LEVEL_META[profile.level].label },
    profile.gender && { label: "Genre", value: profile.gender },
    profile.age && { label: "Age", value: `${profile.age} ans` },
    profile.height && { label: "Taille", value: `${profile.height} cm` },
    profile.weight && { label: "Poids", value: `${profile.weight} kg` },
    profile.sessionDuration?.[0] && {
      label: "Seance cible",
      value: `${profile.sessionDuration[0]} min`,
    },
    profile.weeklyFrequency && {
      label: "Frequence cible",
      value: `${profile.weeklyFrequency} / semaine`,
    },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const extraBlocks = [
    profile.availability?.length
      ? {
          title: "Disponibilites",
          body: escapeHtml(profile.availability.join(" · ")),
        }
      : null,
    profile.equipment?.length
      ? {
          title: "Materiel",
          body: profile.equipment
            .map((item) => `<span class="tag">${escapeHtml(item)}</span>`)
            .join(""),
          isTagList: true,
        }
      : null,
    profile.injuries
      ? {
          title: "Contraintes physiques",
          body: escapeHtml(profile.injuries),
        }
      : null,
    profile.nutritionRestrictions
      ? {
          title: "Restrictions alimentaires",
          body: escapeHtml(profile.nutritionRestrictions),
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; body: string; isTagList?: boolean }>;

  return `
    <div class="page-root">
      <div class="page-header">
        <div class="eyebrow">Profil</div>
        <h1 class="page-title">Profil analyse</h1>
        <p class="page-subtitle">Toutes les donnees qui servent a structurer le programme.</p>
      </div>

      <div class="panel">
        ${renderMetricCards(metrics)}
      </div>

      ${
        extraBlocks.length > 0
          ? `
            <div class="stack">
              ${extraBlocks
                .map(
                  (block) => `
                    <div class="panel">
                      <div class="section-title">${escapeHtml(block.title)}</div>
                      ${
                        block.isTagList
                          ? `<div class="tag-list">${block.body}</div>`
                          : `<p class="body-copy">${block.body}</p>`
                      }
                    </div>
                  `,
                )
                .join("")}
            </div>
          `
          : ""
      }
    </div>
  `;
}

function buildWeekPage(week: Week) {
  const sessionCount = week.sessions?.length ?? 0;

  return `
    <div class="page-root">
      <div class="page-header">
        <div class="eyebrow">Semaine ${escapeHtml(week.week_number)}</div>
        <h1 class="page-title">${escapeHtml(week.focus || `Bloc ${week.week_number}`)}</h1>
        <p class="page-subtitle">${sessionCount} seance${sessionCount > 1 ? "s" : ""} prevue${sessionCount > 1 ? "s" : ""}</p>
      </div>

      <div class="stack">
        ${week.sessions.map((session) => renderSession(session)).join("")}
      </div>
    </div>
  `;
}

function buildGuidancePage(program: Program) {
  const { nutrition_recommendations, general_advice, legal_disclaimer } = program;
  const disclaimerText =
    legal_disclaimer ??
    "Ces recommandations sont informatives uniquement et ne remplacent pas l'avis d'un professionnel de sante ou d'un coach certifie.";

  if (!nutrition_recommendations && !general_advice && !disclaimerText) {
    return "";
  }

  const nutritionMetrics = nutrition_recommendations
    ? renderMetricCards([
        {
          label: "Calories",
          value: `${nutrition_recommendations.daily_calories_estimate} kcal / jour`,
        },
        {
          label: "Proteines",
          value: `${nutrition_recommendations.protein_target_g} g / jour`,
        },
        {
          label: "Hydratation",
          value: `${nutrition_recommendations.water_intake_l} L / jour`,
        },
      ])
    : "";

  return `
    <div class="page-root">
      <div class="page-header">
        <div class="eyebrow">Coaching</div>
        <h1 class="page-title">Recommandations finales</h1>
        <p class="page-subtitle">Nutrition, conseils du coach et rappel important dans un seul cadre.</p>
      </div>

      <div class="guidance-card">
        ${
          nutrition_recommendations
            ? `
              <div class="guidance-section">
                <div class="section-title">Recommandations nutritionnelles</div>
                ${nutritionMetrics}
                <div class="note-box">${escapeHtml(nutrition_recommendations.notes)}</div>
              </div>
            `
            : ""
        }

        ${
          general_advice
            ? `
              <div class="guidance-section">
                <div class="section-title">Conseils du coach</div>
                <p class="body-copy">${escapeHtml(general_advice)}</p>
              </div>
            `
            : ""
        }

        <div class="guidance-section">
          <div class="section-title">Avertissement</div>
          <p class="disclaimer-copy">${escapeHtml(disclaimerText)}</p>
        </div>
      </div>
    </div>
  `;
}

function buildPDFStyles() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .pdf-page {
      width: ${PAGE_WIDTH_PX}px;
      min-height: ${PAGE_HEIGHT_PX}px;
      background: #ffffff;
      color: #0f172a;
      padding: 48px;
      font-family: Inter, Arial, sans-serif;
    }
    .page-root { display: flex; flex-direction: column; gap: 20px; }
    .stack { display: flex; flex-direction: column; gap: 16px; }
    .page-header {
      border-bottom: 2px solid #111827;
      padding-bottom: 18px;
    }
    .eyebrow {
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.24em;
      text-transform: uppercase;
    }
    .page-title {
      margin-top: 10px;
      font-size: 30px;
      font-weight: 900;
      line-height: 1.05;
    }
    .page-subtitle {
      margin-top: 8px;
      color: #64748b;
      font-size: 13px;
      line-height: 1.5;
    }
    .hero-card,
    .panel,
    .session-card,
    .guidance-card {
      border: 1px solid #e5e7eb;
      border-radius: 24px;
      background: #ffffff;
      padding: 20px;
    }
    .hero-card { background: #fafaf9; }
    .hero-label,
    .section-title,
    .subsection-title,
    .block-title {
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    .hero-summary,
    .body-copy {
      margin-top: 12px;
      color: #334155;
      font-size: 13px;
      line-height: 1.65;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    .metric-card {
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      background: #ffffff;
      padding: 14px;
    }
    .metric-label {
      color: #64748b;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .metric-value {
      margin-top: 6px;
      color: #0f172a;
      font-size: 16px;
      font-weight: 800;
      line-height: 1.35;
    }
    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .tag,
    .pill {
      border: 1px solid #e5e7eb;
      border-radius: 999px;
      background: #f8fafc;
      color: #475569;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      padding: 6px 10px;
    }
    .session-header { display: flex; justify-content: space-between; gap: 16px; }
    .session-title {
      font-size: 17px;
      font-weight: 900;
      line-height: 1.3;
    }
    .session-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .subsection,
    .block {
      margin-top: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 8px;
      overflow: hidden;
      border-radius: 18px;
      border: 1px solid #e5e7eb;
    }
    th {
      background: #f8fafc;
      color: #64748b;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      padding: 8px 10px;
      text-align: left;
      text-transform: uppercase;
    }
    td {
      border-top: 1px solid #e5e7eb;
      padding: 8px 10px;
      vertical-align: top;
    }
    td:not(:first-child) {
      text-align: center;
      white-space: nowrap;
    }
    .exercise-name {
      color: #0f172a;
      display: block;
      font-size: 11px;
      font-weight: 700;
    }
    .exercise-detail {
      color: #64748b;
      display: block;
      font-size: 10px;
      line-height: 1.5;
      margin-top: 4px;
    }
    .note-box {
      margin-top: 14px;
      border-radius: 18px;
      background: #f8fafc;
      color: #475569;
      font-size: 12px;
      line-height: 1.6;
      padding: 12px 14px;
    }
    .guidance-card {
      background: #fafaf9;
      border-color: #d6d3d1;
    }
    .guidance-section + .guidance-section {
      border-top: 1px solid #e7e5e4;
      margin-top: 18px;
      padding-top: 18px;
    }
    .disclaimer-copy {
      color: #64748b;
      font-size: 11px;
      line-height: 1.7;
      margin-top: 12px;
    }
  `;
}

function buildPDFPages(program: Program) {
  return [
    buildCoverPage(program),
    buildProfilePage(program.user_profile),
    ...program.weeks.map((week) => buildWeekPage(week)),
    buildGuidancePage(program),
  ].filter(Boolean);
}

export async function exportProgramToPDF(program: Program): Promise<void> {
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    left: -99999px;
    top: 0;
    width: ${PAGE_WIDTH_PX}px;
    background: #ffffff;
    pointer-events: none;
    opacity: 0;
  `;

  container.innerHTML = `
    <style>${buildPDFStyles()}</style>
    ${buildPDFPages(program)
      .map((page) => `<section class="pdf-page">${page}</section>`)
      .join("")}
  `;

  document.body.appendChild(container);

  try {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageElements = Array.from(container.querySelectorAll<HTMLElement>(".pdf-page"));
    let isFirstPdfPage = true;

    for (const pageElement of pageElements) {
      const canvas = await html2canvas(pageElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: PAGE_WIDTH_PX,
        windowHeight: Math.max(PAGE_HEIGHT_PX, pageElement.scrollHeight),
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let yOffset = 0;
      let isFirstSliceForSection = true;

      while (yOffset < imgHeight - 0.1) {
        if (!isFirstPdfPage || !isFirstSliceForSection) {
          pdf.addPage();
        }

        pdf.addImage(imgData, "PNG", 0, -yOffset, imgWidth, imgHeight);

        yOffset += pageHeight;
        isFirstPdfPage = false;
        isFirstSliceForSection = false;
      }
    }

    pdf.save(`programme-Vincere-${Date.now()}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
