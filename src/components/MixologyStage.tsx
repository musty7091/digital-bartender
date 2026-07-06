import { useMemo } from "react";
import type { Cocktail, PreparationStep } from "../types";
import "./MixologyStage.css";

type StageAction =
  | "pour"
  | "ice"
  | "drop"
  | "muddle"
  | "stir"
  | "shake"
  | "strain"
  | "rim"
  | "garnish"
  | "serve";

type VesselTarget = "glass" | "mixer";

type LiquidLayer = {
  id: string;
  label: string;
  color: string;
  volumeMl: number;
};

type CompiledStep = {
  id: string;
  title: string;
  description: string;
  label: string;
  action: StageAction;
  target: VesselTarget;
  color: string;
  volumeMl: number;
  source: PreparationStep;
};

const SHAKER_CAPACITY_ML = 550;

const GLASS_SPECS: Record<
  Cocktail["glassType"],
  {
    label: string;
    capacityMl: number;
  }
> = {
  highball: {
    label: "Highball",
    capacityMl: 300,
  },
  rocks: {
    label: "Rocks",
    capacityMl: 300,
  },
  coupe: {
    label: "Coupe",
    capacityMl: 180,
  },
  margarita: {
    label: "Margarita",
    capacityMl: 200,
  },
};

const techniqueToAction: Record<PreparationStep["technique"], StageAction> = {
  build: "pour",
  shake: "shake",
  stir: "stir",
  muddle: "muddle",
  strain: "strain",
  garnish: "garnish",
  serve: "serve",
};

export function MixologyStage({
  cocktail,
  stepIndex,
}: {
  cocktail: Cocktail;
  stepIndex: number;
}) {
  const compiledSteps = useMemo(() => compileSteps(cocktail), [cocktail]);

  const currentStep = compiledSteps[stepIndex] ?? compiledSteps[0];
  const visibleSteps = compiledSteps.slice(0, stepIndex + 1);

  const glassSpec = GLASS_SPECS[cocktail.glassType];
  const usesMixer = compiledSteps.some(
    (step) => step.action === "shake" || step.action === "strain"
  );

  const visibleStrainIndex = visibleSteps.findIndex(
    (step) => step.action === "strain"
  );

  const hasStrained = visibleStrainIndex >= 0;
  const isCurrentStrain = currentStep?.action === "strain";

  const mixerPourSteps = visibleSteps.filter(
    (step) =>
      step.action === "pour" &&
      step.target === "mixer" &&
      (!hasStrained || isCurrentStrain)
  );

  const mixerSourceSteps = compiledSteps
    .slice(0, hasStrained ? stepIndex : stepIndex + 1)
    .filter((step) => step.action === "pour" && step.target === "mixer");

  const directGlassPours = visibleSteps.filter(
    (step) => step.action === "pour" && step.target === "glass"
  );

  const mixerTransferredVolumeMl = hasStrained
    ? sumVolume(mixerSourceSteps)
    : 0;

  const strainLayer: LiquidLayer | null =
    hasStrained && mixerTransferredVolumeMl > 0
      ? {
          id: "strained-result",
          label: "Süzülen karışım",
          color: blendLayerColor(mixerSourceSteps),
          volumeMl: mixerTransferredVolumeMl,
        }
      : null;

  const glassLayers: LiquidLayer[] = [
    ...directGlassPours.map(stepToLayer),
    ...(strainLayer ? [strainLayer] : []),
  ];

  const mixerLayers: LiquidLayer[] =
    hasStrained && !isCurrentStrain ? [] : mixerPourSteps.map(stepToLayer);

  const glassVolumeMl = Math.min(sumVolume(glassLayers), glassSpec.capacityMl);
  const mixerVolumeMl = Math.min(sumVolume(mixerLayers), SHAKER_CAPACITY_ML);

  const showMixer =
    usesMixer &&
    (!hasStrained ||
      isCurrentStrain ||
      currentStep?.target === "mixer" ||
      currentStep?.action === "shake");

  const showPourStream = currentStep?.action === "pour";
  const showStrainStream = currentStep?.action === "strain";

  const glassHasIce =
    visibleSteps.some((step) => step.action === "ice" && step.target === "glass") ||
    (hasStrained && cocktail.glassType === "rocks");

  const mixerHasIce =
    visibleSteps.some((step) => step.action === "ice" && step.target === "mixer") &&
    (!hasStrained || isCurrentStrain);

  const glassHasRim = visibleSteps.some((step) => step.action === "rim");

  const glassHasBubbles = visibleSteps.some(
    (step) =>
      step.target === "glass" &&
      /soda|tonik|prosecco|sparkling|köpüklü/i.test(step.label)
  );

  const glassGarnishStep = [...visibleSteps]
    .reverse()
    .find((step) => step.action === "garnish");

  const garnishEmoji = glassGarnishStep
    ? getGarnishEmoji(glassGarnishStep.label)
    : null;

  const mode = currentStep?.action ?? "serve";
  const streamColor = currentStep?.color ?? blendLayerColor(mixerSourceSteps);

  return (
    <div className={`mixology-stage mx-mode-${mode}`}>
      <div className="mx-ambient-light" />
      <div className="mx-counter-glow" />

      <div className="mx-stage-topline">
        <span>{currentStep?.title ?? "Hazırlık"}</span>
        <strong>{mode.toUpperCase()}</strong>
      </div>

      <div className="mx-volume-readout">
        <span>
          Bardak: <strong>{formatCl(glassVolumeMl)}</strong> /{" "}
          {formatCl(glassSpec.capacityMl)}
        </span>
        {showMixer && (
          <span>
            Shaker: <strong>{formatCl(mixerVolumeMl)}</strong>
          </span>
        )}
      </div>

      <div className="mx-workspace">
        {showMixer && (
          <div className="mx-slot mx-mixer-slot">
            <MixerVessel
              layers={mixerLayers}
              hasIce={mixerHasIce}
              active={mode === "shake"}
            />
          </div>
        )}

        {showPourStream && (
          <div
            className={`mx-pour-stream ${
              currentStep.target === "mixer" ? "mx-to-mixer" : "mx-to-glass"
            }`}
            style={{ background: streamColor }}
          />
        )}

        {showStrainStream && (
          <div
            className="mx-strain-stream"
            style={{ background: blendLayerColor(mixerSourceSteps) }}
          />
        )}

        {mode === "muddle" && (
          <div className="mx-tool mx-muddler">
            <span />
          </div>
        )}

        {mode === "stir" && (
          <div className="mx-tool mx-spoon">
            <span />
          </div>
        )}

        <div className="mx-slot mx-glass-slot">
          <GlassVessel
            glassType={cocktail.glassType}
            glassLabel={glassSpec.label}
            layers={glassLayers}
            capacityMl={glassSpec.capacityMl}
            hasIce={glassHasIce}
            hasRim={glassHasRim}
            hasBubbles={glassHasBubbles}
            garnishEmoji={garnishEmoji}
            active={mode === "muddle" || mode === "stir"}
          />
        </div>
      </div>
    </div>
  );
}

function compileSteps(cocktail: Cocktail): CompiledStep[] {
  const usesMixer = cocktail.steps.some(
    (step) => step.technique === "shake" || step.technique === "strain"
  );

  return cocktail.steps.map((step, index) => {
    const ingredient = cocktail.ingredients.find(
      (item) => item.name === step.ingredientName
    );

    const textBlob = `${step.id} ${step.title} ${step.description} ${
      step.ingredientName ?? ""
    }`.toLowerCase();

    let action: StageAction = techniqueToAction[step.technique];

    if (/ice|buz/.test(textBlob)) {
      action = "ice";
    }

    if (
      step.technique === "garnish" &&
      (/rim|kenar|tuz/.test(textBlob) || step.id === "rim")
    ) {
      action = "rim";
    }

    if (step.technique === "serve") {
      action = "garnish";
    }

    let target: VesselTarget = "glass";

    if (
      usesMixer &&
      (action === "pour" || action === "ice") &&
      step.technique !== "serve"
    ) {
      target = "mixer";
    }

    if (action === "strain" || action === "garnish" || action === "rim") {
      target = "glass";
    }

    const label = ingredient
      ? `${ingredient.amount} ${ingredient.name}`
      : step.ingredientName ?? step.title;

    const volumeMl =
      action === "pour" && ingredient
        ? getIngredientVolumeMl(ingredient.amount, ingredient.name, cocktail.glassType)
        : 0;

    return {
      id: step.id,
      title: step.title,
      description: step.description,
      label,
      action,
      target,
      color: ingredient?.color ?? colorByIndex(index),
      volumeMl,
      source: step,
    };
  });
}

function MixerVessel({
  layers,
  hasIce,
  active,
}: {
  layers: LiquidLayer[];
  hasIce: boolean;
  active: boolean;
}) {
  return (
    <div className={`mx-vessel mx-mixer ${active ? "mx-active" : ""}`}>
      <div className="mx-shaker-cap" />

      <div className="mx-bowl">
        <LiquidStack layers={layers} capacityMl={SHAKER_CAPACITY_ML} />

        {hasIce && <IceSet />}

        <div className="mx-shine" />
        <div className="mx-shaker-label">SHAKER</div>
      </div>
    </div>
  );
}

function GlassVessel({
  glassType,
  glassLabel,
  layers,
  capacityMl,
  hasIce,
  hasRim,
  hasBubbles,
  garnishEmoji,
  active,
}: {
  glassType: Cocktail["glassType"];
  glassLabel: string;
  layers: LiquidLayer[];
  capacityMl: number;
  hasIce: boolean;
  hasRim: boolean;
  hasBubbles: boolean;
  garnishEmoji: string | null;
  active: boolean;
}) {
  return (
    <div
      className={`mx-vessel mx-glass mx-glass-${glassType} ${
        active ? "mx-active" : ""
      }`}
      aria-label={glassLabel}
    >
      {hasRim && <div className="mx-rim" />}

      <div className="mx-bowl">
        <LiquidStack layers={layers} capacityMl={capacityMl} />

        {hasIce && <IceSet />}

        {hasBubbles && <BubbleSet />}

        <div className="mx-shine" />
      </div>

      {(glassType === "coupe" || glassType === "margarita") && (
        <>
          <div className="mx-stem" />
          <div className="mx-foot" />
        </>
      )}

      {garnishEmoji && <div className="mx-garnish">{garnishEmoji}</div>}
    </div>
  );
}

function LiquidStack({
  layers,
  capacityMl,
}: {
  layers: LiquidLayer[];
  capacityMl: number;
}) {
  let usedPercent = 0;

  return (
    <div className="mx-liquid-stack">
      {layers.map((layer) => {
        const rawPercent = (layer.volumeMl / capacityMl) * 100;
        const safePercent = Math.max(0, Math.min(rawPercent, 96 - usedPercent));
        usedPercent += safePercent;

        return (
          <div
            key={layer.id}
            className="mx-liquid-layer"
            title={`${layer.label} — ${formatCl(layer.volumeMl)}`}
            style={{
              height: `${safePercent}%`,
              background: `linear-gradient(180deg, ${softenColor(
                layer.color
              )}, ${layer.color})`,
            }}
          />
        );
      })}
    </div>
  );
}

function IceSet() {
  return (
    <>
      <i className="mx-ice mx-ice-one" />
      <i className="mx-ice mx-ice-two" />
      <i className="mx-ice mx-ice-three" />
    </>
  );
}

function BubbleSet() {
  return (
    <>
      {Array.from({ length: 12 }).map((_, index) => (
        <i
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className="mx-bubble"
          style={{
            left: `${14 + ((index * 17) % 68)}%`,
            width: `${3 + (index % 4)}px`,
            height: `${3 + (index % 4)}px`,
            animationDelay: `${index * 0.18}s`,
            animationDuration: `${1.6 + (index % 5) * 0.22}s`,
          }}
        />
      ))}
    </>
  );
}

function stepToLayer(step: CompiledStep): LiquidLayer {
  return {
    id: step.id,
    label: step.label,
    color: step.color,
    volumeMl: step.volumeMl,
  };
}

function sumVolume(items: Array<{ volumeMl: number }>) {
  return items.reduce((total, item) => total + item.volumeMl, 0);
}

function getIngredientVolumeMl(
  amount: string,
  ingredientName: string,
  glassType: Cocktail["glassType"]
) {
  const parsed = parseVolumeMl(amount);

  if (parsed > 0) {
    return parsed;
  }

  const normalizedAmount = amount.toLowerCase();
  const normalizedName = ingredientName.toLowerCase();

  if (normalizedAmount.includes("tamamla")) {
    if (normalizedName.includes("soda")) return glassType === "highball" ? 90 : 60;
    if (normalizedName.includes("tonik")) return glassType === "highball" ? 120 : 80;
  }

  if (normalizedName.includes("soda")) return 90;
  if (normalizedName.includes("tonik")) return 120;
  if (normalizedName.includes("prosecco")) return 90;
  if (normalizedName.includes("espresso")) return 30;

  return 0;
}

function parseVolumeMl(amount: string) {
  const normalized = amount.toLowerCase().replace(",", ".");

  const mlMatch = normalized.match(/(\d+(?:\.\d+)?)\s*ml/);
  if (mlMatch) {
    return Number(mlMatch[1]);
  }

  const clMatch = normalized.match(/(\d+(?:\.\d+)?)\s*cl/);
  if (clMatch) {
    return Number(clMatch[1]) * 10;
  }

  const ozMatch = normalized.match(/(\d+(?:\.\d+)?)\s*oz/);
  if (ozMatch) {
    return Number(ozMatch[1]) * 29.5735;
  }

  const dashMatch = normalized.match(/(\d+)?\s*dash/);
  if (dashMatch) {
    return Number(dashMatch[1] ?? 1) * 1;
  }

  return 0;
}

function blendLayerColor(steps: Array<{ color: string; volumeMl: number }>) {
  const weightedSteps = steps.filter((step) => step.volumeMl > 0);

  if (weightedSteps.length === 0) {
    return "#f59e0b";
  }

  let totalVolume = 0;
  let red = 0;
  let green = 0;
  let blue = 0;

  weightedSteps.forEach((step) => {
    const rgb = hexToRgb(step.color);

    if (!rgb) return;

    totalVolume += step.volumeMl;
    red += rgb.r * step.volumeMl;
    green += rgb.g * step.volumeMl;
    blue += rgb.b * step.volumeMl;
  });

  if (totalVolume === 0) {
    return weightedSteps[weightedSteps.length - 1].color;
  }

  return rgbToHex({
    r: Math.round(red / totalVolume),
    g: Math.round(green / totalVolume),
    b: Math.round(blue / totalVolume),
  });
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "").trim();

  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }

  if (clean.length !== 6) {
    return null;
  }

  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex(rgb: { r: number; g: number; b: number }) {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function softenColor(color: string) {
  const rgb = hexToRgb(color);

  if (!rgb) return color;

  return rgbToHex({
    r: Math.round(rgb.r + (255 - rgb.r) * 0.22),
    g: Math.round(rgb.g + (255 - rgb.g) * 0.22),
    b: Math.round(rgb.b + (255 - rgb.b) * 0.22),
  });
}

function colorByIndex(index: number) {
  const colors = [
    "#f59e0b",
    "#fb7185",
    "#a3e635",
    "#bae6fd",
    "#fde68a",
    "#f97316",
  ];

  return colors[index % colors.length];
}

function formatCl(ml: number) {
  const cl = ml / 10;

  return `${cl.toLocaleString("tr-TR", {
    maximumFractionDigits: cl % 1 === 0 ? 0 : 1,
  })} cl`;
}

function getGarnishEmoji(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("portakal")) return "🍊";
  if (normalized.includes("lime")) return "🍋";
  if (normalized.includes("limon")) return "🍋";
  if (normalized.includes("nane")) return "🌿";
  if (normalized.includes("kahve")) return "☕";
  if (normalized.includes("cherry") || normalized.includes("kiraz")) return "🍒";

  return "🍸";
}