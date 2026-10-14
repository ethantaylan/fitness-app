import type { Page } from "@playwright/test";

export interface AuditIssue {
  rule: "cible-tactile" | "taille-texte" | "contraste" | "masque";
  detail: string;
}

/**
 * Vérifications du DOM rendu : zones tactiles ≥ 44 px, textes ≥ 11 px, contraste ≥ 4,5:1
 * (3:1 pour les grands textes) et éléments interactifs jamais masqués par la navigation,
 * un panneau fixe ou un bouton flottant une fois la page défilée jusqu'en bas.
 */
export async function auditPage(page: Page): Promise<AuditIssue[]> {
  await page.evaluate(() => window.scrollTo(0, 0));
  const issues = await page.evaluate(() => {
    const out: { rule: string; detail: string }[] = [];
    const label = (el: Element) => {
      const text = (el.getAttribute("aria-label") || el.textContent || "")
        .trim()
        .replace(/\s+/g, " ");
      return `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}> « ${text.slice(0, 50)} »`;
    };
    const visible = (el: Element) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      for (let node: Element | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") return false;
        if (node.hasAttribute("inert") || node.getAttribute("aria-hidden") === "true") return false;
        // Contenu d'un <details> fermé : non rendu, hors summary.
        if (
          node instanceof HTMLDetailsElement &&
          !node.open &&
          !el.closest("summary")?.parentElement?.isSameNode(node)
        )
          return false;
      }
      return true;
    };

    // 1. Zones tactiles
    const interactive = [
      ...document.querySelectorAll<HTMLElement>(
        'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="checkbox"], [role="tab"]',
      ),
    ].filter(visible);
    for (const el of interactive) {
      if (el.matches(".sr-only, .sr-only *")) continue;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      // Lien dans une phrase : exempté (WCAG 2.5.8), seuls les liens autonomes comptent.
      if (el.tagName === "A" && style.display === "inline") continue;
      if (rect.width < 43.5 || rect.height < 43.5)
        out.push({
          rule: "cible-tactile",
          detail: `${label(el)} mesure ${Math.round(rect.width)}×${Math.round(rect.height)} px`,
        });
    }

    // 2. Taille et contraste du texte
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const rgba = (value: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = "#000";
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    };
    const blend = (fg: number[], bg: number[]) => {
      const a = fg[3] / 255;
      return fg.slice(0, 3).map((c, i) => c * a + bg[i] * (1 - a));
    };
    const luminance = (channels: number[]) =>
      channels
        .map((c) => {
          const v = c / 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const seen = new Set<Element>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim();
      const el = node.parentElement;
      if (!text || !el || seen.has(el) || !visible(el)) continue;
      if (el.closest("script, style, noscript, .sr-only, option")) continue;
      seen.add(el);
      const style = getComputedStyle(el);
      const size = parseFloat(style.fontSize);
      if (size < 10.95) out.push({ rule: "taille-texte", detail: `${label(el)} en ${size}px` });

      let background = [255, 255, 255];
      let gradient = false;
      let opacity = 1;
      const chain: Element[] = [];
      for (let n: Element | null = el; n; n = n.parentElement) chain.unshift(n);
      for (const n of chain) {
        const s = getComputedStyle(n);
        if (s.backgroundImage !== "none") gradient = true;
        background = blend(rgba(s.backgroundColor), background);
        opacity *= Number(s.opacity);
      }
      if (gradient) continue;
      const fgRaw = rgba(style.color);
      fgRaw[3] = fgRaw[3] * opacity;
      const fg = blend(fgRaw, background);
      const a = luminance(fg);
      const b = luminance(background);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
      const disabled = el.closest(":disabled, [aria-disabled='true']");
      if (!disabled && ratio < (large ? 3 : 4.5))
        out.push({
          rule: "contraste",
          detail: `${label(el)} : ${ratio.toFixed(2)}:1 (${Math.round(fg[0])},${Math.round(fg[1])},${Math.round(fg[2])} sur ${Math.round(background[0])},${Math.round(background[1])},${Math.round(background[2])})`,
        });
    }
    return out;
  });

  // 3. Rien de masqué en bas de page (navigation, dock, bouton flottant)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  const hidden = await page.evaluate(() => {
    const out: { rule: string; detail: string }[] = [];
    const fixed = (el: Element) => {
      for (let n: Element | null = el; n; n = n.parentElement)
        if (getComputedStyle(n).position === "fixed") return true;
      return false;
    };
    const controls = document.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, summary, [role="checkbox"], [role="tab"]',
    );
    for (const el of controls) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || fixed(el)) continue;
      if (rect.bottom < 0 || rect.top > innerHeight) continue;
      if (el.closest("[inert], [aria-hidden='true'], .sr-only, details:not([open]):not(summary)")) {
        if (!el.matches("summary")) continue;
      }
      if (getComputedStyle(el).visibility === "hidden") continue;
      const points = [
        [rect.left + rect.width / 2, rect.top + rect.height / 2],
        [rect.left + rect.width / 2, Math.min(rect.bottom - 2, innerHeight - 1)],
      ];
      for (const [x, y] of points) {
        if (y < 0 || y >= innerHeight) continue;
        const top = document.elementFromPoint(x, y);
        // Seuls comptent les recouvrements par un élément ancré en bas (navigation, dock, bouton flottant) :
        // le contenu qui passe sous l'en-tête fixe en défilant est normal.
        let anchor: Element | null = top;
        while (anchor && getComputedStyle(anchor).position !== "fixed")
          anchor = anchor.parentElement;
        const anchoredBottom = anchor && anchor.getBoundingClientRect().top > innerHeight / 2;
        if (top && !el.contains(top) && !top.contains(el) && anchoredBottom) {
          const text = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40);
          out.push({
            rule: "masque",
            detail: `« ${text} » est recouvert par ${top.tagName.toLowerCase()}.${String(top.className).slice(0, 40)}`,
          });
          break;
        }
      }
    }
    return out;
  });
  return [...issues, ...hidden] as AuditIssue[];
}
