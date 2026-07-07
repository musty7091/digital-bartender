import { useEffect, useMemo, useState, type CSSProperties } from "react";
import "./App.css";
import {
  RECIPES,
  CATEGORIES,
  GLASSES,
  type Category,
  type Recipe,
} from "./data/recipes";
import {
  loadCustom,
  upsertCustom,
  deleteCustom,
  isCustom,
} from "./data/customStore";
import {
  loadProducts,
  loadFinal,
  type Product,
} from "./data/productStore";
import {
  compileSteps,
  ACTION_ICON,
  colorOf,
  formatAmount,
  type Unit,
} from "./engine/compile";
import { MixologyStage } from "./components/MixologyStage";
import { RecipeForm } from "./components/RecipeForm";
import { ProductAdmin } from "./components/ProductAdmin";
import { ProductStrip } from "./components/ProductStrip";
import { KioskAttract } from "./components/KioskAttract";
import { Finale } from "./components/Finale";
import { useInstallPrompt, usePwaUpdate } from "./hooks/usePwa";

const AGE_KEY = "dijitalBarmen.age.v1";
const TAB_ORDER: Category[] = ["all", "u", "c", "e", "custom"];
const AUTO_MS = 2600;
const KIOSK_IDLE_MS = 90_000;
const UNIT_KEY = "dijitalBarmen.unit.v1"; // kioskta 90 sn dokunulmazsa cazibe ekranı

function App() {
  const [ageAccepted, setAgeAccepted] = useState(
    () => localStorage.getItem(AGE_KEY) === "true"
  );
  const [tab, setTab] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [recipe, setRecipe] = useState<Recipe>(RECIPES[0]);
  const [stepIndex, setStepIndex] = useState(-1);
  const [auto, setAuto] = useState(false);

  // İmza kokteylleri (kullanıcı, localStorage)
  const [custom, setCustom] = useState<Recipe[]>(() => loadCustom());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | undefined>(undefined);

  // Porsiyon (1×–8×): ml'ler ölçeklenir, animasyon oranları aynı kalır
  const [servings, setServings] = useState(1);

  // Miktar birimi tercihi (ml/cl) — cihazda hatırlanır
  const [unit, setUnitState] = useState<Unit>(
    () => (localStorage.getItem(UNIT_KEY) === "cl" ? "cl" : "ml")
  );
  function setUnit(u: Unit) {
    setUnitState(u);
    localStorage.setItem(UNIT_KEY, u);
  }

  // Final ekranı: son adım tamamlanınca gerçek kokteyl fotoğrafına geçiş.
  // 'finaleAt' hangi (tarif+adım) için finalin açık olduğunu tutar; adım
  // veya tarif değişince anahtar eşleşmez ve final kendiliğinden kapanır.
  const [finaleAt, setFinaleAt] = useState<string | null>(null);
  const [finalPhoto, setFinalPhoto] = useState<string | null>(null);

  // Önerilen ürünler (IndexedDB) + admin ekranı + kiosk modu
  const [products, setProducts] = useState<Product[]>([]);
  const [adminOpen, setAdminOpen] = useState(
    () => window.location.hash === "#admin"
  );
  const [kiosk] = useState(() => window.location.hash === "#kiosk");
  const [attract, setAttract] = useState(kiosk); // kiosk açılışta cazibe ekranı

  // Ürünleri yükle (admin kapanınca yenile ki eklenenler görünsün)
  useEffect(() => {
    let on = true;
    loadProducts().then((list) => {
      if (on) setProducts(list);
    });
    return () => {
      on = false;
    };
  }, [adminOpen]);

  // Seçili kokteylin final fotoğrafını yükle (admin kapanınca da yenile)
  useEffect(() => {
    let on = true;
    loadFinal(recipe.id).then((img) => {
      if (on) setFinalPhoto(img);
    });
    return () => {
      on = false;
    };
  }, [recipe, adminOpen]);

  // Son adım tamamlanınca (süsleme animasyonu bitince) finali göster
  const finaleKey = recipe.id + ":" + stepIndex;
  useEffect(() => {
    if (stepIndex < 0) return;
    if (stepIndex !== compileSteps(recipe).length - 1) return;
    const t = window.setTimeout(() => setFinaleAt(finaleKey), 1500);
    return () => window.clearTimeout(t);
  }, [stepIndex, recipe, finaleKey]);
  const showFinale = finaleAt === finaleKey && stepIndex >= 0;

  // #admin hash'i ile yönetim ekranı aç/kapa
  useEffect(() => {
    const onHash = () => setAdminOpen(window.location.hash === "#admin");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Kiosk boşta kalma: dokunuş yoksa cazibe ekranına dön
  useEffect(() => {
    if (!kiosk) return;
    let timer = window.setTimeout(() => setAttract(true), KIOSK_IDLE_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setAttract(true), KIOSK_IDLE_MS);
    };
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [kiosk]);

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

  // Porsiyona göre ölçeklenmiş tarif: ml'ler × porsiyon.
  // Oranlar değişmediği için sahne animasyonu birebir aynı kalır,
  // yalnızca adım etiketleri ve malzeme listesi ölçeklenir.
  const scaledRecipe = useMemo<Recipe>(() => {
    if (servings === 1) return recipe;
    return {
      ...recipe,
      ing: recipe.ing.map(
        (row) => [row[0], row[1] * servings, row[2], row[3]] as typeof row
      ),
    };
  }, [recipe, servings]);

  const steps = useMemo(
    () => compileSteps(scaledRecipe, unit),
    [scaledRecipe, unit]
  );
  const total = steps.length;

  // Hazır + imza kokteyllerinin tümü
  const allRecipes = useMemo(() => [...RECIPES, ...custom], [custom]);

  const list = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    let items = allRecipes.slice();
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
  }, [tab, query, allRecipes]);

  function selectRecipe(r: Recipe) {
    setAuto(false);
    setRecipe(r);
    setStepIndex(-1);
    setServings(1);
    setMobileView("stage"); // mobilde sahneye geç (masaüstünde etkisiz)
  }

  // İmza kokteyli kaydet (ekle/güncelle)
  function saveCustom(r: Recipe) {
    const updated = upsertCustom(r);
    setCustom(updated);
    setFormOpen(false);
    setEditing(undefined);
    setTab("custom");
    selectRecipe(r);
  }

  // İmza kokteyli sil
  function removeCustom(id: string) {
    const updated = deleteCustom(id);
    setCustom(updated);
    // Silinen kokteyl seçiliyse ilk tarife dön
    if (recipe.id === id) {
      setRecipe(RECIPES[0]);
      setStepIndex(-1);
    }
  }

  function openAdd() {
    setEditing(undefined);
    setFormOpen(true);
  }
  function openEdit(r: Recipe) {
    setEditing(r);
    setFormOpen(true);
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

          <button className="add-cocktail" onClick={openAdd}>
            <span className="add-plus">＋</span> İmza Kokteyli Ekle
          </button>

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
                <span className="li-name">
                  {isCustom(r.id) && <span className="li-badge">İmza</span>}
                  {r.n}
                </span>
                <span className="li-glass">
                  {(GLASSES[r.g] || GLASSES.highball).name}
                </span>
              </button>
            ))}
            {list.length === 0 && tab === "custom" && !query && (
              <div className="empty">
                <p>Henüz imza kokteylin yok.</p>
                <button className="ctrl ctrl-play" onClick={openAdd}>
                  İlk Kokteylini Ekle
                </button>
              </div>
            )}
            {list.length === 0 && (query || tab !== "custom") && (
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
            {isCustom(recipe.id) && (
              <div className="recipe-actions">
                <button className="mini-btn" onClick={() => openEdit(recipe)}>
                  ✎ Düzenle
                </button>
                <button
                  className="mini-btn mini-danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        `"${recipe.n}" kokteylini silmek istediğine emin misin?`
                      )
                    )
                      removeCustom(recipe.id);
                  }}
                >
                  🗑 Sil
                </button>
              </div>
            )}
          </div>

          <div className="stage-wrap">
            <MixologyStage recipe={scaledRecipe} stepIndex={stepIndex} />
            {showFinale && (
              <Finale
                recipe={recipe}
                photo={finalPhoto}
                onReplay={() => {
                  setFinaleAt(null);
                  restart();
                }}
              />
            )}
          </div>

          <div className="servings">
            <span className="servings-label">Porsiyon</span>
            <button
              className="ctrl servings-btn"
              onClick={() => setServings((s) => Math.max(1, s - 1))}
              disabled={servings <= 1}
              aria-label="Porsiyonu azalt"
            >
              −
            </button>
            <span className="servings-value neon-amber">{servings}×</span>
            <button
              className="ctrl servings-btn"
              onClick={() => setServings((s) => Math.min(8, s + 1))}
              disabled={servings >= 8}
              aria-label="Porsiyonu artır"
            >
              +
            </button>

            <span className="unit-sep" />

            <div className="unit-toggle" role="group" aria-label="Birim seçimi">
              <button
                className={"unit-btn" + (unit === "ml" ? " unit-on" : "")}
                onClick={() => setUnit("ml")}
              >
                ml
              </button>
              <button
                className={"unit-btn" + (unit === "cl" ? " unit-on" : "")}
                onClick={() => setUnit("cl")}
              >
                cl
              </button>
            </div>
          </div>

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
            <h3 className="detail-title">
              Malzemeler{servings > 1 ? ` (${servings} porsiyon)` : ""}
            </h3>
            <ul className="ings">
              {scaledRecipe.ing.map((row, i) => (
                <li key={i} className="ing">
                  <span
                    className="ing-dot"
                    style={
                      { background: colorOf(row[2]) } as CSSProperties
                    }
                  />
                  <span className="ing-name">{row[0]}</span>
                  <span className="ing-ml">{formatAmount(row[1], unit)}</span>
                </li>
              ))}
            </ul>
          </section>

          <ProductStrip
            products={products.filter((p) => p.recipeId === recipe.id)}
          />
        </aside>
      </div>

      {formOpen && (
        <RecipeForm
          editing={editing}
          onSave={saveCustom}
          onCancel={() => {
            setFormOpen(false);
            setEditing(undefined);
          }}
        />
      )}

      {adminOpen && (
        <ProductAdmin
          recipes={allRecipes}
          onClose={() => {
            setAdminOpen(false);
            if (window.location.hash === "#admin")
              window.history.replaceState(null, "", " ");
          }}
        />
      )}

      {kiosk && attract && (
        <KioskAttract
          recipes={allRecipes}
          products={products}
          onEnter={(r) => {
            setAttract(false);
            selectRecipe(r);
          }}
        />
      )}

      {!kiosk && (canInstall || offlineReady || needRefresh) && (
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
