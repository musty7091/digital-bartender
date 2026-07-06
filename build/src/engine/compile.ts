// ============================================================
// DİJİTAL BARMEN — TARİF DERLEYİCİ (saf mantık, DOM'suz)
// Kompakt tarifleri adım dizisine derler.
// Masaüstü motordan taşındı; render React'te yapılır.
// ============================================================

import { ING_COLORS, type Recipe } from "../data/recipes";

export const GLASS_CAP = 78; // bardaktaki azami görünür doluluk (%)
export const MIX_CAP = 62; // shaker / karıştırma bardağı azami doluluk (%)

export const colorOf = (c: string): string =>
  c && c.startsWith("#") ? c : ING_COLORS[c] || "#f59e0b";

// Ağırlıklı renk karışımı (süzme sonrası bardaktaki nihai renk)
export function blendColors(items: [string, number][]): string {
  let r = 0,
    g = 0,
    b = 0,
    w = 0;
  items.forEach(([hex, wt]) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return;
    const v = parseInt(m[1], 16);
    r += ((v >> 16) & 255) * wt;
    g += ((v >> 8) & 255) * wt;
    b += (v & 255) * wt;
    w += wt;
  });
  if (!w) return "#fbbf24";
  const h = (x: number) => Math.round(x / w).toString(16).padStart(2, "0");
  return "#" + h(r) + h(g) + h(b);
}

// ------------------------------------------------------------
// Adım tipleri
// ------------------------------------------------------------
export type StepAction =
  | "rim"
  | "drop"
  | "muddle"
  | "ice"
  | "pour"
  | "shake"
  | "stirmix"
  | "strain"
  | "stir"
  | "garnish";

export type VesselKind = "glass" | "mixer";

export type Step = {
  action: StepAction;
  label: string;
  text: string;
  target?: VesselKind;
  color?: string;
  fill?: number;
  fizz?: boolean;
  big?: boolean;
  crushed?: boolean;
  emoji?: string;
  emoji2?: string;
  result?: string;
};

const ICE_LABEL: Record<string, string> = {
  cube: "Küp Buz",
  big: "Büyük Buz Küpü",
  crushed: "Kırık Buz",
};

export function compileSteps(r: Recipe): Step[] {
  const steps: Step[] = [];
  const usesMixer = r.m === "shake" || r.m === "stirup";
  const mixerName = r.m === "shake" ? "shakera" : "karıştırma bardağına";

  // Malzemeleri ayır: süzme öncesi / sonrası (bayrak 'a')
  const pre = r.ing.filter((i) => !(i[3] || "").includes("a"));
  const post = r.ing.filter((i) => (i[3] || "").includes("a"));
  const sumPre = pre.reduce((s, i) => s + i[1], 0) || 1;
  const sumAll = r.ing.reduce((s, i) => s + i[1], 0) || 1;

  // 1) Kenar kaplama
  if (r.rim)
    steps.push({
      action: "rim",
      label: `${r.rim}lu Kenar`,
      text: `Bardağın kenarını lime ile ıslatıp ${r.rim.toLocaleLowerCase(
        "tr"
      )}a batırın.`,
    });

  // 2) Ezme (muddle) — her zaman bardakta
  if (r.mud) {
    steps.push({
      action: "drop",
      target: "glass",
      emoji: r.mud[0],
      emoji2: r.mud[1],
      label: r.mud[2],
      text: `${r.mud[2]} bardağa ekleyin.`,
    });
    steps.push({
      action: "muddle",
      label: "Nazikçe Ezin",
      text: "Muddler ile malzemeleri nazikçe ezerek aromayı açığa çıkarın.",
    });
  }

  // 3) Build/stir yönteminde önce buz
  if (!usesMixer && r.ice && r.ice !== "none")
    steps.push({
      action: "ice",
      target: "glass",
      big: r.ice === "big",
      crushed: r.ice === "crushed",
      label: ICE_LABEL[r.ice],
      text: `Bardağa ${ICE_LABEL[r.ice].toLocaleLowerCase("tr")} ekleyin.`,
    });

  // 4) Süzme öncesi dökümler
  pre.forEach(([label, ml, ck, flags]) => {
    const fill = usesMixer
      ? Math.max(4, (ml / sumPre) * MIX_CAP)
      : Math.max(4, (ml / sumAll) * GLASS_CAP);
    steps.push({
      action: "pour",
      target: usesMixer ? "mixer" : "glass",
      color: colorOf(ck),
      fill,
      fizz: (flags || "").includes("f"),
      label: `${ml}ml ${label}`,
      text: `${label} ${usesMixer ? mixerName : "bardağa"} dökün.`,
    });
  });

  // 5) Karıştırıcı işlemleri
  if (usesMixer) {
    steps.push({
      action: "ice",
      target: "mixer",
      label: "Küp Buz",
      text: `Bolca buzu ${mixerName} ekleyin.`,
    });
    if (r.m === "shake")
      steps.push({
        action: "shake",
        label: "Sertçe Çalkalayın",
        text: "Kapağı kapatın ve iyice soğuyana dek 12-15 saniye sertçe çalkalayın!",
      });
    else
      steps.push({
        action: "stirmix",
        label: "20-30 sn Karıştırın",
        text: "Bar kaşığıyla buzun etrafında zarifçe 20-30 saniye karıştırın.",
      });
    const result = blendColors(pre.map((i) => [colorOf(i[2]), i[1]]));
    steps.push({
      action: "strain",
      label: "Bardağa Süzün",
      result,
      fill: (sumPre / sumAll) * GLASS_CAP,
      text: "Karışımı süzgeçten geçirerek bardağa boşaltın.",
    });
  }

  // 6) Süzme sonrası dökümler (şampanya, soda, float...)
  post.forEach(([label, ml, ck, flags]) => {
    steps.push({
      action: "pour",
      target: "glass",
      color: colorOf(ck),
      fill: Math.max(4, (ml / sumAll) * GLASS_CAP),
      fizz: (flags || "").includes("f"),
      label: `${ml}ml ${label}`,
      text: `${label} ile tamamlayın.`,
    });
  });

  // 7) Bardakta karıştırma (stir yöntemi)
  if (r.m === "stir")
    steps.push({
      action: "stir",
      label: "Karıştırın",
      text: "Bar kaşığıyla alttan üste hafifçe karıştırın.",
    });

  // 8) Süsleme
  if (r.gar)
    steps.push({
      action: "garnish",
      emoji: r.gar[0],
      label: r.gar[1],
      text: `${r.gar[1]} ile süsleyin. Şerefe!`,
    });

  return steps;
}

export const ACTION_ICON: Record<StepAction, string> = {
  pour: "💧",
  ice: "🧊",
  drop: "🌿",
  muddle: "🥄",
  stir: "🔄",
  stirmix: "🔄",
  shake: "🍸",
  strain: "⏳",
  rim: "◍",
  garnish: "🍋",
};
