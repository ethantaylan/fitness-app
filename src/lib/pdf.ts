import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Program } from "./types";
import { OBJECTIVE_LABELS } from "./agents";

export async function exportProgramToPDF(program: Program): Promise<void> {
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 794px;
    background: #ffffff;
    font-family: Inter, sans-serif;
    color: #0d0d0d;
    padding: 48px;
    box-sizing: border-box;
  `;
  container.innerHTML = buildPDFHtml(program);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let yOffset = 0;
    while (yOffset < imgHeight) {
      if (yOffset > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, -yOffset, imgWidth, imgHeight);
      yOffset += pageHeight;
    }

    pdf.save(`programme-Vincere-${Date.now()}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

function buildPDFHtml(program: Program): string {
  const { program_overview, weeks, nutrition_recommendations, general_advice, user_profile } =
    program;

  const profileSection = user_profile
    ? `<div class="section">
        <h2>Profil</h2>
        <div class="grid-2">
          ${user_profile.gender ? `<div><span class="label">Genre</span><span>${user_profile.gender}</span></div>` : ""}
          ${user_profile.age ? `<div><span class="label">Âge</span><span>${user_profile.age} ans</span></div>` : ""}
          ${user_profile.height ? `<div><span class="label">Taille</span><span>${user_profile.height} cm</span></div>` : ""}
          ${user_profile.weight ? `<div><span class="label">Poids</span><span>${user_profile.weight} kg</span></div>` : ""}
          ${user_profile.level ? `<div><span class="label">Niveau</span><span>${user_profile.level}</span></div>` : ""}
          ${user_profile.objective ? `<div><span class="label">Objectif</span><span>${OBJECTIVE_LABELS[user_profile.objective] ?? user_profile.objective}</span></div>` : ""}
        </div>
      </div>`
    : "";

  const weeksHtml = weeks
    .map(
      (week) => `
      <div class="week">
        <h2>Semaine ${week.week_number} — ${week.focus}</h2>
        ${week.sessions
          .map(
            (session) => `
          <div class="session">
            <h3>${session.day} · ${session.type} · ${session.duration_min} min · ${session.intensity}</h3>
            ${session.warmup?.length ? `<p class="sub">Échauffement : ${session.warmup.map((w) => `${w.name} (${w.duration_sec}s)`).join(" · ")}</p>` : ""}
            ${session.blocks
              .map(
                (block) => `
              <div class="block">
                <p class="block-name">${block.block_name}</p>
                <table>
                  <thead>
                    <tr>
                      <th>Exercice</th>
                      <th>Séries</th>
                      <th>Répétitions</th>
                      <th>Charge</th>
                      <th>Repos</th>
                      <th>Alternative</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${block.exercises
                      .map(
                        (ex) => `
                      <tr>
                        <td>${ex.name}${ex.notes ? `<br><small>${ex.notes}</small>` : ""}</td>
                        <td>${ex.sets}</td>
                        <td>${ex.reps}</td>
                        <td>${ex.load_kg ?? "—"}</td>
                        <td>${ex.rest_sec ? `${ex.rest_sec}s` : "—"}</td>
                        <td>${ex.alternative ?? "—"}</td>
                      </tr>`,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>`,
              )
              .join("")}
            ${session.cooldown?.length ? `<p class="sub">Récupération : ${session.cooldown.map((c) => `${c.name} (${c.duration_sec}s)`).join(" · ")}</p>` : ""}
            ${session.notes ? `<p class="note">${session.notes}</p>` : ""}
          </div>`,
          )
          .join("")}
      </div>`,
    )
    .join("");

  const nutritionSection = nutrition_recommendations
    ? `<div class="section">
          <h2>Recommandations Nutritionnelles</h2>
          <div class="grid-2">
            <div><span class="label">Calories estimées</span><span>${nutrition_recommendations.daily_calories_estimate} kcal/jour</span></div>
            <div><span class="label">Protéines</span><span>${nutrition_recommendations.protein_target_g} g/jour</span></div>
            <div><span class="label">Hydratation</span><span>${nutrition_recommendations.water_intake_l} L/jour</span></div>
          </div>
          <p class="note">${nutrition_recommendations.notes}</p>
        </div>`
    : "";

  return `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Inter, sans-serif; color: #0d0d0d; }
      h1 { font-size: 28px; font-weight: 900; margin-bottom: 4px; }
      h2 { font-size: 18px; font-weight: 700; margin: 24px 0 12px; border-bottom: 2px solid #0d0d0d; padding-bottom: 6px; }
      h3 { font-size: 14px; font-weight: 700; margin: 16px 0 8px; }
      .header { margin-bottom: 32px; }
      .tagline { font-size: 13px; color: #666; }
      .section { margin-bottom: 24px; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .grid-2 div { display: flex; gap: 8px; align-items: center; font-size: 13px; }
      .label { font-weight: 600; min-width: 80px; color: #444; }
      .week { margin-bottom: 32px; }
      .session { margin-bottom: 20px; padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px; }
      .block { margin: 12px 0; }
      .block-name { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #555; margin-bottom: 6px; }
      .sub { font-size: 12px; color: #666; margin: 6px 0; }
      .note { font-size: 12px; color: #444; font-style: italic; margin-top: 8px; padding: 8px; background: #f7f7f7; border-radius: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px; }
      th { background: #0d0d0d; color: #fff; padding: 6px 8px; text-align: left; font-weight: 600; }
      td { padding: 5px 8px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) td { background: #f9f9f9; }
      small { color: #888; }
      .disclaimer { margin-top: 32px; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 11px; color: #888; }
    </style>
    <div class="header">
      <h1>Vincere</h1>
      <p class="tagline">Programme sportif personnalisé · Généré par IA · ${new Date().toLocaleDateString("fr-FR")}</p>
    </div>
    ${profileSection}
    <div class="section">
      <h2>Vue d'ensemble</h2>
      <p style="font-size:13px;">${program_overview.summary}</p>
      <div class="grid-2" style="margin-top:12px;">
        <div><span class="label">Durée</span><span>${program_overview.duration_weeks} semaines</span></div>
        <div><span class="label">Fréquence</span><span>${program_overview.training_days_per_week} séances/semaine</span></div>
      </div>
    </div>
    ${weeksHtml}
    ${nutritionSection}
    ${general_advice ? `<div class="section"><h2>Conseils du Coach</h2><p style="font-size:13px;">${general_advice}</p></div>` : ""}
    <div class="disclaimer">
      ⚠️ ${program.legal_disclaimer ?? "Ces recommandations sont à titre informatif uniquement et ne remplacent pas l'avis d'un professionnel de santé ou d'un coach certifié."}
    </div>
  `;
}
