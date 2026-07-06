import { useMemo, type CSSProperties } from "react";
import { GLASSES, type Recipe } from "../data/recipes";
import {
  compileSteps,
  type Step,
  type VesselKind,
} from "../engine/compile";

// ============================================================
// Sahne durumu: stepIndex'e kadar olan tüm adımları "derleyip"
// bardağın/shaker'ın o anki halini üretir. Böylece ileri/geri
// gitmek deterministik olur; React yeniden çizer.
// ============================================================

type Layer = { color: string; fill: number };
type IceItem = {
  size: number;
  left: number;
  bottom: number;
  rot: number;
};
type Bit = { emoji: string; left: number; bottom: number };

type VesselState = {
  layers: Layer[];
  ice: IceItem[];
  bits: Bit[];
  fizz: boolean;
};

type SceneState = {
  glass: VesselState;
  mixer: VesselState;
  rim: boolean;
  garnish: string | null;
  strained: boolean;
};

const emptyVessel = (): VesselState => ({
  layers: [],
  ice: [],
  bits: [],
  fizz: false,
});

// Buz konumlarını adım indeksine göre deterministik üret (rastgelelik yerine)
function makeIce(kind: VesselKind, step: Step, bw: number): IceItem[] {
  const n = step.big ? 1 : step.crushed ? 8 : 3;
  const out: IceItem[] = [];
  for (let i = 0; i < n; i++) {
    // sözde-rastgele ama deterministik dağılım
    const seed = (i * 97 + (kind === "glass" ? 13 : 47)) % 100;
    const size = step.big ? 74 : step.crushed ? 18 + (seed % 11) : 40 + (seed % 12);
    out.push({
      size,
      left: bw * 0.13 + ((seed * 1.9) % (bw * 0.56)),
      bottom: 7 + (step.crushed ? i * 12 : i * 18) + (seed % 12),
      rot: (seed % 30) - 15,
    });
  }
  return out;
}

function makeBits(step: Step, bw: number): Bit[] {
  const emojis = [step.emoji, step.emoji2, step.emoji].filter(Boolean) as string[];
  return emojis.map((e, i) => {
    const seed = (i * 61 + 7) % 100;
    return {
      emoji: e,
      left: bw * 0.14 + ((seed * 1.6) % (bw * 0.52)),
      bottom: 5 + i * 16,
    };
  });
}

// stepIndex dahil, o ana kadarki adımları uygulayarak sahneyi kur
function buildScene(steps: Step[], upto: number, glassW: number): SceneState {
  const scene: SceneState = {
    glass: emptyVessel(),
    mixer: emptyVessel(),
    rim: false,
    garnish: null,
    strained: false,
  };
  const mixerW = 165;

  for (let i = 0; i <= upto && i < steps.length; i++) {
    const s = steps[i];
    const target = (s.target || "glass") as VesselKind;
    const v = scene[target];
    const bw = target === "glass" ? glassW : mixerW;

    switch (s.action) {
      case "pour":
        v.layers.push({ color: s.color!, fill: s.fill! });
        if (s.fizz) v.fizz = true;
        break;
      case "ice":
        v.ice.push(...makeIce(target, s, bw));
        break;
      case "drop":
        v.bits.push(...makeBits(s, bw));
        break;
      case "strain":
        // mixer boşalır, bardağa tek katman iner
        scene.mixer.layers = [];
        scene.mixer.ice = [];
        scene.mixer.bits = [];
        scene.strained = true;
        scene.glass.layers.push({ color: s.result!, fill: s.fill! });
        break;
      case "rim":
        scene.rim = true;
        break;
      case "garnish":
        scene.garnish = s.emoji || "🍒";
        break;
      // muddle / shake / stir / stirmix → yalnızca aktif adımda geçici animasyon
      default:
        break;
    }
  }
  return scene;
}

// ------------------------------------------------------------
// Tek kap (bardak veya shaker/karıştırma) çizimi
// ------------------------------------------------------------
function Vessel({
  kind,
  recipe,
  state,
  motionClass,
}: {
  kind: VesselKind;
  recipe: Recipe;
  state: VesselState;
  motionClass: string;
}) {
  if (kind === "glass") {
    const g = GLASSES[recipe.g] || GLASSES.highball;
    const bowlStyle: CSSProperties = {
      width: g.w,
      height: g.h,
      borderRadius: g.radius,
    };
    return (
      <div className={`vessel ${motionClass}`} data-vessel="glass">
        <div className="glass-wrap">
          <div className={"bowl" + (g.metal ? " metal" : "")} style={bowlStyle}>
            <LiquidStack layers={state.layers} />
            {state.ice.map((c, i) => (
              <span
                key={"i" + i}
                className="ice"
                style={{
                  width: c.size,
                  height: c.size,
                  left: c.left,
                  bottom: c.bottom,
                  transform: `rotate(${c.rot}deg)`,
                }}
              />
            ))}
            {state.bits.map((b, i) => (
              <span
                key={"b" + i}
                className="bit"
                style={{ left: b.left, bottom: b.bottom, fontSize: 27 }}
              >
                {b.emoji}
              </span>
            ))}
            {state.fizz && <Bubbles />}
          </div>
          {g.stem && (
            <>
              <div className="stem" style={{ height: g.stemH || 70 }} />
              <div className="foot" style={{ width: g.w * 0.55 }} />
            </>
          )}
        </div>
      </div>
    );
  }

  // mixer
  const isShaker = recipe.m === "shake";
  const bodyStyle: CSSProperties = isShaker
    ? { width: 165, height: 260, borderRadius: "18px 18px 44px 44px" }
    : { width: 190, height: 245, borderRadius: "8px 8px 26px 26px" };
  return (
    <div className={`vessel ${motionClass}`} data-vessel="mixer">
      {isShaker && <div className="shaker-cap" />}
      <div className={"bowl" + (isShaker ? " steel" : "")} style={bodyStyle}>
        <LiquidStack layers={state.layers} />
        {state.ice.map((c, i) => (
          <span
            key={"mi" + i}
            className="ice"
            style={{
              width: c.size,
              height: c.size,
              left: c.left,
              bottom: c.bottom,
              transform: `rotate(${c.rot}deg)`,
            }}
          />
        ))}
      </div>
      <div className="vessel-label">
        {isShaker ? "Shaker" : "Karıştırma Bardağı"}
      </div>
    </div>
  );
}

function LiquidStack({ layers }: { layers: Layer[] }) {
  return (
    <div className="liquid-stack">
      {layers.map((l, i) => (
        <div
          key={i}
          className="layer"
          style={{ background: l.color, height: `${l.fill}%` }}
        />
      ))}
    </div>
  );
}

function Bubbles() {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const seed = (i * 37) % 100;
        return {
          size: 3 + (seed % 5),
          left: 10 + ((seed * 1.3) % 80),
          dur: 1.4 + (seed % 16) / 10,
          delay: (seed % 12) / 10,
        };
      }),
    []
  );
  return (
    <>
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="bubble"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.left}%`,
            animationDuration: `${b.dur}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </>
  );
}

// ------------------------------------------------------------
// Ana sahne bileşeni
// ------------------------------------------------------------
export function MixologyStage({
  recipe,
  stepIndex,
}: {
  recipe: Recipe;
  stepIndex: number;
}) {
  const steps = useMemo(() => compileSteps(recipe), [recipe]);
  const glassW = (GLASSES[recipe.g] || GLASSES.highball).w;
  const scene = useMemo(
    () => buildScene(steps, stepIndex, glassW),
    [steps, stepIndex, glassW]
  );

  const usesMixer = recipe.m === "shake" || recipe.m === "stirup";
  const activeStep = steps[stepIndex];

  // Aktif adıma göre geçici hareket animasyonu (çalkala / karıştır / ez / süz).
  // State/effect yok: sınıfı doğrudan hesaplıyoruz ve `key`'e stepIndex koyarak
  // adım değiştiğinde CSS animasyonunun bir kez baştan oynamasını sağlıyoruz.
  let glassMotion = "";
  let mixerMotion = "";
  if (activeStep) {
    switch (activeStep.action) {
      case "shake":
        mixerMotion = "shaking";
        break;
      case "stirmix":
        mixerMotion = "stirring";
        break;
      case "strain":
        mixerMotion = "tilting";
        break;
      case "muddle":
        glassMotion = "muddling";
        break;
      case "stir":
        glassMotion = "stirring";
        break;
    }
  }

  return (
    <div className="stage">
      <div className="stage-glow" />
      <div className="stage-vessels">
        {usesMixer && (
          <Vessel
            key={mixerMotion ? `mixer-${mixerMotion}-${stepIndex}` : "mixer"}
            kind="mixer"
            recipe={recipe}
            state={scene.mixer}
            motionClass={mixerMotion}
          />
        )}
        <div className="glass-column">
          {scene.rim && <RimSalt glassW={glassW} />}
          <Vessel
            key={glassMotion ? `glass-${glassMotion}-${stepIndex}` : "glass"}
            kind="glass"
            recipe={recipe}
            state={scene.glass}
            motionClass={glassMotion}
          />
          {scene.garnish && (
            <span className="garnish" key={scene.garnish}>
              {scene.garnish}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function RimSalt({ glassW }: { glassW: number }) {
  return (
    <div
      className="rim-salt"
      style={{ width: glassW * 1.06, left: "50%", transform: "translateX(-50%)" }}
    />
  );
}
