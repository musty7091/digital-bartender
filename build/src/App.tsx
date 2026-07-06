import { useEffect, useMemo, useState, type CSSProperties } from "react";
import "./App.css";
import {
  RECIPES,
  CATEGORIES,
  GLASSES,
  type Category,
  type Recipe,
} from "./data/recipes";
import { compileSteps, ACTION_ICON, colorOf } from "./engine/compile";
import { MixologyStage } from "./components/MixologyStage";
import { useInstallPrompt, usePwaUpdate } from "./hooks/usePwa";

const AGE_KEY = "dijitalBarmen.age.v1";
const TAB_ORDER: Category[] = ["all", "u", "c", "e"];
const AUTO_MS = 2600;

function App() {
  const [ageAccepted, setAgeAccepted] = useState(
    () => localStorage.getItem(AGE_KEY) === "true"
  );
  const [tab, setTab] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [recipe, setRecipe] = useState<Recipe>(RECIPES[0]);
  const [stepIndex, setStepIndex] = useState(-1);
  const [auto, setAuto] = useState(false);

  // Mobil: liste ↔ sahne geçişi. Masaüstünde her ikisi de aynı anda görünür.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1024
  );
  const [mobileView, setMobileView] = useState<"list" | "stage">("list");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const { canInstall, promptInstall, dismiss: dismissInstall } =
    useInstallPrompt();
  const { needRefresh, offlineReady, applyUpdate, dismissOfflineReady } =
    usePwaUpdate();

  const steps = useMemo(() => compileSteps(recipe), [recipe]);
  const total = steps.length;

  const list = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    let items = RECIPES.slice();
    if (tab !== "all") items = items.filter((r) => r.cat === tab);
    if (q)
      items = items.filter((r) => {
        const hay = (
          r.n +
          " " +
          r.ing.map((i) => i[0]).join(" ")
        ).toLocaleLowerCase("tr");
        return hay.includes(q);
      });
    items.sort((a, b) => a.n.localeCompare(b.n, "tr"));
    return items;
  }, [tab, query]);

  function selectRecipe(r: Recipe) {
    setAuto(false);
    setRecipe(r);
    setStepIndex(-1);
    setMobileView("stage"); // mobilde sahneye geç (masaüstünde etkisiz)
  }

  useEffect(() => {
    // Sadece oynatma açıkken ve son adıma gelmemişken bir sonraki adımı zamanla
    if (!auto || stepIndex >= total - 1) return;
    const t = window.setTimeout(
      () => setStepIndex((i) => Math.min(total - 1, i + 1)),
      AUTO_MS
    );
    return () => window.clearTimeout(t);
  }, [auto, stepIndex, total]);

  const next = () => {
    setAuto(false);
    setStepIndex((i) => Math.min(total - 1, i + 1));
  };
  const prev = () => {
    setAuto(false);
    setStepIndex((i) => Math.max(-1, i - 1));
  };
  const restart = () => {
    setAuto(false);
    setStepIndex(-1);
  };

  function acceptAge() {
    localStorage.setItem(AGE_KEY, "true");
    setAgeAccepted(true);
  }

  if (!ageAccepted) return <AgeGate onAccept={acceptAge} />;

  const activeStep = stepIndex >= 0 ? steps[stepIndex] : null;
  const done = stepIndex >= total - 1;

  return (
    <div className="app">
      <header
        className={
          "app-header" +
          (isMobile && mobileView === "stage" ? " header-compact" : "")
        }
      >
        <div className="brand">
          <span className="brand-mark neon-amber neon-flicker">Dijital</span>{" "}
          <span className="brand-mark neon-rose">Barmen</span>
        </div>
        <p className="brand-sub">
          {RECIPES.length} tarif · adım adım interaktif karışım
        </p>
      </header>

      <div
        className={
          "layout" +
          (isMobile ? " is-mobile" : "") +
          (isMobile && mobileView === "stage" ? " show-stage" : " show-list")
        }
      >
        <aside className="sidebar glass-panel">
          <div className="search-wrap">
            <span className="search-ic">🔍</span>
            <input
              className="search"
              placeholder="Kokteyl veya malzeme ara…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="tabs slim-scroll">
            {TAB_ORDER.map((c) => (
              <button
                key={c}
                className={"tab" + (tab === c ? " tab-active" : "")}
                onClick={() => setTab(c)}
              >
                {CATEGORIES[c]}
              </button>
            ))}
          </div>

          <div className="list slim-scroll">
            {list.map((r) => (
              <button
                key={r.id}
                className={
                  "list-item" + (r.id === recipe.id ? " item-active" : "")
                }
                onClick={() => selectRecipe(r)}
              >
                <span className="li-name">{r.n}</span>
                <span className="li-glass">
                  {(GLASSES[r.g] || GLASSES.highball).name}
                </span>
              </button>
            ))}
            {list.length === 0 && (
              <p className="empty">
                “{query}” için sonuç yok. Farklı bir isim deneyin.
              </p>
            )}
          </div>
        </aside>

        <main className="stage-panel">
          {isMobile && (
            <button
              className="back-btn"
              onClick={() => setMobileView("list")}
            >
              ‹ Kokteyller
            </button>
          )}
          <div className="recipe-head">
            <h2 className="recipe-name font-neon">{recipe.n}</h2>
            <p className="recipe-desc">{recipe.d}</p>
          </div>

          <MixologyStage recipe={recipe} stepIndex={stepIndex} />

          <div className="controls">
            <button
              className="ctrl"
              onClick={prev}
              disabled={stepIndex < 0}
              aria-label="Önceki adım"
            >
              ‹
            </button>
            <button
              className="ctrl ctrl-play"
              onClick={() => (done ? restart() : setAuto((a) => !a))}
            >
              {done ? "↻ Baştan" : auto ? "⏸ Duraklat" : "▶ Oynat"}
              {/* done iken auto otomatik anlamsız; buton Baştan'a döner */}
            </button>
            <button
              className="ctrl"
              onClick={next}
              disabled={done}
              aria-label="Sonraki adım"
            >
              ›
            </button>
          </div>

          <div className="progress">
            <div
              className="progress-bar"
              style={{
                width: `${total ? ((stepIndex + 1) / total) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="progress-text">
            {stepIndex < 0
              ? "Hazır — başlamak için Oynat"
              : `Adım ${stepIndex + 1} / ${total}`}
          </p>
        </main>

        <aside className="detail glass-panel slim-scroll">
          <section className="active-step">
            <h3 className="detail-title">Şu an</h3>
            {activeStep ? (
              <div className="step-now">
                <span className="step-ic">
                  {ACTION_ICON[activeStep.action]}
                </span>
                <div>
                  <p className="step-label">{activeStep.label}</p>
                  <p className="step-text">{activeStep.text}</p>
                </div>
              </div>
            ) : (
              <p className="step-text muted">
                Bardağını seç, adımları izle. Şerefe! 🍸
              </p>
            )}
          </section>

          <section>
            <h3 className="detail-title">Adımlar</h3>
            <ol className="steps">
              {steps.map((s, i) => (
                <li
                  key={i}
                  className={
                    "step-row" +
                    (i === stepIndex ? " step-active" : "") +
                    (i < stepIndex ? " step-done" : "")
                  }
                  onClick={() => {
                    setAuto(false);
                    setStepIndex(i);
                  }}
                >
                  <span className="step-row-ic">{ACTION_ICON[s.action]}</span>
                  <span className="step-row-label">{s.label}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="detail-title">Malzemeler</h3>
            <ul className="ings">
              {recipe.ing.map((row, i) => (
                <li key={i} className="ing">
                  <span
                    className="ing-dot"
                    style={
                      { background: colorOf(row[2]) } as CSSProperties
                    }
                  />
                  <span className="ing-name">{row[0]}</span>
                  <span className="ing-ml">{row[1]} ml</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {(canInstall || offlineReady || needRefresh) && (
        <div className="toasts">
          {canInstall && (
            <div className="toast">
              <span>Ana ekrana ekle, çevrimdışı kullan.</span>
              <div className="toast-actions">
                <button onClick={promptInstall}>Ekle</button>
                <button className="ghost" onClick={dismissInstall}>
                  Kapat
                </button>
              </div>
            </div>
          )}
          {needRefresh && (
            <div className="toast">
              <span>Yeni sürüm hazır.</span>
              <div className="toast-actions">
                <button onClick={applyUpdate}>Güncelle</button>
              </div>
            </div>
          )}
          {offlineReady && !needRefresh && (
            <div className="toast">
              <span>Çevrimdışı kullanıma hazır.</span>
              <div className="toast-actions">
                <button className="ghost" onClick={dismissOfflineReady}>
                  Tamam
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AgeGate({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="agegate">
      <div className="agegate-card glass-panel">
        <div className="brand big">
          <span className="neon-amber neon-flicker">Dijital</span>{" "}
          <span className="neon-rose">Barmen</span>
        </div>
        <p className="agegate-text">
          Bu uygulama alkollü içecek tariflerini görsel olarak anlatır. Devam
          etmek için 18 yaşından büyük olduğunu onayla.
        </p>
        <button className="ctrl ctrl-play wide" onClick={onAccept}>
          18 yaşından büyüğüm — Gir
        </button>
        <p className="agegate-note">Lütfen sorumlu tüket.</p>
      </div>
    </div>
  );
}

export default App;
