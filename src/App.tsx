import { useEffect, useMemo, useState, type CSSProperties } from "react";
import "./App.css";
import { cocktails } from "./data/cocktails";
import { MixologyStage } from "./components/MixologyStage";
import { useInstallPrompt, usePwaUpdate } from "./hooks/usePwa";
import type { Cocktail, CocktailCategory, GlassType } from "./types";

type Screen = "welcome" | "explore" | "prepare" | "ingredients" | "mine";

const categoryLabels: Record<CocktailCategory | "all", string> = {
  all: "Tümü",
  classic: "Klasikler",
  tropical: "Tropikal",
  refreshing: "Ferah",
  strong: "Güçlü",
  signature: "İmza",
};

const techniqueLabels = {
  shake: "SHAKE",
  stir: "STIR",
  build: "BUILD",
  muddle: "MUDDLE",
  strain: "STRAIN",
  garnish: "GARNISH",
  serve: "SERVE",
} as const;

function App() {
  const [ageAccepted, setAgeAccepted] = useState(
    () => localStorage.getItem("db-age-accepted") === "true"
  );

  const [screen, setScreen] = useState<Screen>(
    ageAccepted ? "explore" : "welcome"
  );

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CocktailCategory | "all">("all");
  const [selectedCocktail, setSelectedCocktail] = useState<Cocktail>(cocktails[0]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const { canInstall, promptInstall, dismiss: dismissInstall } =
    useInstallPrompt();
  const { needRefresh, offlineReady, applyUpdate, dismissOfflineReady } =
    usePwaUpdate();

  const filteredCocktails = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return cocktails.filter((cocktail) => {
      const matchesCategory = category === "all" || cocktail.category === category;

      const matchesQuery =
        normalizedQuery.length === 0 ||
        cocktail.name.toLowerCase().includes(normalizedQuery) ||
        cocktail.subtitle.toLowerCase().includes(normalizedQuery) ||
        cocktail.glass.toLowerCase().includes(normalizedQuery) ||
        cocktail.tasteProfile.some((taste) =>
          taste.toLowerCase().includes(normalizedQuery)
        );

      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const currentStep = selectedCocktail.steps[stepIndex];

  useEffect(() => {
    if (filteredCocktails.length === 0) return;

    const selectedStillVisible = filteredCocktails.some(
      (cocktail) => cocktail.id === selectedCocktail.id
    );

    if (!selectedStillVisible) {
      setSelectedCocktail(filteredCocktails[0]);
      setStepIndex(0);
      setIsAutoPlaying(false);
    }
  }, [filteredCocktails, selectedCocktail.id]);

  useEffect(() => {
    setStepIndex((current) =>
      Math.min(current, selectedCocktail.steps.length - 1)
    );
  }, [selectedCocktail]);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = window.setInterval(() => {
      setStepIndex((current) => {
        if (current >= selectedCocktail.steps.length - 1) {
          setIsAutoPlaying(false);
          return current;
        }

        return current + 1;
      });
    }, 2400);

    return () => window.clearInterval(timer);
  }, [isAutoPlaying, selectedCocktail.steps.length]);

  function acceptAgeGate() {
    localStorage.setItem("db-age-accepted", "true");
    setAgeAccepted(true);
    setScreen("explore");
  }

  function previewCocktail(cocktail: Cocktail) {
    setSelectedCocktail(cocktail);
    setStepIndex(0);
    setIsAutoPlaying(false);
  }

  function startPreparing(cocktail: Cocktail) {
    setSelectedCocktail(cocktail);
    setStepIndex(0);
    setIsAutoPlaying(false);
    setScreen("prepare");
  }

  function openIngredients(cocktail: Cocktail) {
    setSelectedCocktail(cocktail);
    setIsAutoPlaying(false);
    setScreen("ingredients");
  }

  function goPreviousStep() {
    setIsAutoPlaying(false);
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  function goNextStep() {
    setIsAutoPlaying(false);
    setStepIndex((current) =>
      Math.min(current + 1, selectedCocktail.steps.length - 1)
    );
  }

  return (
    <div className="app-shell">
      <main className="phone-frame">
        {screen === "welcome" && (
          <section className="welcome-screen">
            <div className="brand-mark">DB</div>

            <p className="eyebrow">Interactive Mixology Studio</p>

            <h1>Dijital Barmen</h1>

            <p className="welcome-text">
              Kokteylleri okumak yerine, adım adım izleyerek hazırla.
            </p>

            <div className="age-card">
              <strong>18+ Yaş Onayı</strong>
              <span>
                Bu uygulama eğitim ve eğlence amaçlıdır. Alkol satışı yapmaz.
                Lütfen sorumlu tüketin.
              </span>
            </div>

            <button className="primary-button" onClick={acceptAgeGate}>
              18 yaşından büyüğüm, başla
            </button>
          </section>
        )}

        {screen === "explore" && (
          <section className="screen">
            <header className="screen-header">
              <div>
                <p className="eyebrow">Dijital Barmen</p>
                <h2>Bu Akşam Ne Hazırlıyoruz?</h2>
                <p className="subtle-text">
                  Kokteyli seç, sahneyi aç, adım adım hazırla.
                </p>
              </div>
            </header>

            <div className="search-box">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Kokteyl, bardak veya tat ara..."
              />
            </div>

            <div className="chip-row">
              {Object.entries(categoryLabels).map(([key, label]) => (
                <button
                  key={key}
                  className={category === key ? "chip active" : "chip"}
                  onClick={() => {
                    setCategory(key as CocktailCategory | "all");
                    setIsAutoPlaying(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <section className="explore-hero">
              <div className="hero-copy">
                <p className="hero-kicker">Öne çıkan kokteyl</p>
                <h3>{selectedCocktail.name}</h3>
                <p>{selectedCocktail.subtitle}</p>

                <div className="mini-tags">
                  <span>{selectedCocktail.glass}</span>
                  <span>{selectedCocktail.durationMinutes} dk</span>
                  <span>{selectedCocktail.difficulty}</span>
                </div>

                <div className="hero-actions">
                  <button
                    className="primary-button compact"
                    onClick={() => startPreparing(selectedCocktail)}
                  >
                    Hazırlamayı Başlat
                  </button>

                  <button
                    className="secondary-button compact"
                    onClick={() => openIngredients(selectedCocktail)}
                  >
                    Malzemeler
                  </button>
                </div>
              </div>

              <div className="hero-visual">
                <CocktailPreview cocktail={selectedCocktail} variant="hero" />
              </div>
            </section>

            <div className="section-title-row">
              <strong>Koleksiyon</strong>
              <span>{filteredCocktails.length} kokteyl</span>
            </div>

            <div className="collection-list">
              {filteredCocktails.length === 0 ? (
                <div className="empty-card">
                  <strong>Sonuç bulunamadı</strong>
                  <p>Başka bir arama kelimesi veya kategori dene.</p>
                </div>
              ) : (
                filteredCocktails.map((cocktail) => (
                  <button
                    key={cocktail.id}
                    className={
                      selectedCocktail.id === cocktail.id
                        ? "collection-card active"
                        : "collection-card"
                    }
                    onClick={() => previewCocktail(cocktail)}
                    onDoubleClick={() => startPreparing(cocktail)}
                  >
                    <div className="collection-copy">
                      <h3>{cocktail.name}</h3>
                      <p>{cocktail.subtitle}</p>

                      <div className="mini-tags">
                        <span>{cocktail.glass}</span>
                        <span>{cocktail.durationMinutes} dk</span>
                      </div>

                      <small>Önizle • Başlatmak için üst kartı kullan</small>
                    </div>

                    <div className="collection-visual">
                      <CocktailPreview cocktail={cocktail} variant="card" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        )}

        {screen === "prepare" && (
          <section className="screen prepare-screen">
            <header className="screen-header">
              <div>
                <p className="eyebrow">Hazırlanıyor</p>
                <h2>{selectedCocktail.name}</h2>
              </div>

              <button
                className="ghost-button"
                onClick={() => {
                  setIsAutoPlaying(false);
                  setScreen("explore");
                }}
              >
                Liste
              </button>
            </header>

            <MixologyStage cocktail={selectedCocktail} stepIndex={stepIndex} />

            <div className="step-card">
              <div className="step-progress">
                <span>
                  Adım {stepIndex + 1} / {selectedCocktail.steps.length}
                </span>
                <span>{techniqueLabels[currentStep.technique]}</span>
              </div>

              <h3>{currentStep.title}</h3>
              <p>{currentStep.description}</p>

              {currentStep.ingredientName && (
                <div className="active-ingredient">
                  Kullanılan malzeme: <strong>{currentStep.ingredientName}</strong>
                </div>
              )}
            </div>

            <div className="control-grid">
              <button className="secondary-button" onClick={goPreviousStep}>
                Geri
              </button>

              <button
                className={isAutoPlaying ? "primary-button danger" : "primary-button"}
                onClick={() => setIsAutoPlaying((current) => !current)}
              >
                {isAutoPlaying ? "Durdur" : "Otomatik Oynat"}
              </button>

              <button className="secondary-button" onClick={goNextStep}>
                İleri
              </button>
            </div>
          </section>
        )}

        {screen === "ingredients" && (
          <section className="screen">
            <header className="screen-header">
              <div>
                <p className="eyebrow">Malzemeler</p>
                <h2>{selectedCocktail.name}</h2>
                <p className="subtle-text">{selectedCocktail.subtitle}</p>
              </div>

              <button
                className="ghost-button"
                onClick={() => startPreparing(selectedCocktail)}
              >
                Hazırla
              </button>
            </header>

            <div className="ingredients-hero">
              <CocktailPreview cocktail={selectedCocktail} variant="hero" />
            </div>

            <div className="info-grid">
              <div>
                <span>Bardak</span>
                <strong>{selectedCocktail.glass}</strong>
              </div>
              <div>
                <span>Süre</span>
                <strong>{selectedCocktail.durationMinutes} dk</strong>
              </div>
              <div>
                <span>Zorluk</span>
                <strong>{selectedCocktail.difficulty}</strong>
              </div>
            </div>

            <div className="ingredient-list">
              {selectedCocktail.ingredients.map((ingredient) => (
                <div className="ingredient-row" key={ingredient.name}>
                  <i style={{ background: ingredient.color }} />
                  <span>{ingredient.name}</span>
                  <strong>{ingredient.amount}</strong>
                </div>
              ))}
            </div>

            <div className="taste-card">
              <span>Tat Profili</span>

              <div className="mini-tags">
                {selectedCocktail.tasteProfile.map((taste) => (
                  <em key={taste}>{taste}</em>
                ))}
              </div>
            </div>
          </section>
        )}

        {screen === "mine" && (
          <section className="screen empty-screen">
            <div className="brand-mark small">DB</div>

            <h2>Benim Kokteyllerim</h2>

            <p>
              Bir sonraki sürümde kendi kokteylini oluşturma, kaydetme ve
              hazırlama motoruna gönderme modülünü burada açacağız.
            </p>
          </section>
        )}

        {needRefresh && (
          <div className="pwa-toast">
            <p>
              <strong>Yeni sürüm hazır</strong>
              Güncellemeyi uygulamak için yenile.
            </p>
            <div className="pwa-toast-actions">
              <button className="pwa-btn-primary" onClick={() => applyUpdate()}>
                Yenile
              </button>
            </div>
          </div>
        )}

        {!needRefresh && offlineReady && (
          <div className="pwa-toast">
            <p>
              <strong>Offline kullanıma hazır</strong>
              İnternet olmasa da açılabilir.
            </p>
            <div className="pwa-toast-actions">
              <button className="pwa-btn-ghost" onClick={dismissOfflineReady}>
                Tamam
              </button>
            </div>
          </div>
        )}

        {!needRefresh && !offlineReady && canInstall && ageAccepted && (
          <div className="pwa-toast">
            <p>
              <strong>Ana ekrana ekle</strong>
              Uygulama gibi, tam ekran ve hızlı açılsın.
            </p>
            <div className="pwa-toast-actions">
              <button className="pwa-btn-ghost" onClick={dismissInstall}>
                Sonra
              </button>
              <button className="pwa-btn-primary" onClick={promptInstall}>
                Ekle
              </button>
            </div>
          </div>
        )}

        {ageAccepted && (
          <nav className="bottom-nav">
            <button
              className={screen === "explore" ? "active" : ""}
              onClick={() => {
                setIsAutoPlaying(false);
                setScreen("explore");
              }}
            >
              Keşfet
            </button>

            <button
              className={screen === "prepare" ? "active" : ""}
              onClick={() => {
                setIsAutoPlaying(false);
                setScreen("prepare");
              }}
            >
              Hazırla
            </button>

            <button
              className={screen === "ingredients" ? "active" : ""}
              onClick={() => {
                setIsAutoPlaying(false);
                setScreen("ingredients");
              }}
            >
              Malzemeler
            </button>

            <button
              className={screen === "mine" ? "active" : ""}
              onClick={() => {
                setIsAutoPlaying(false);
                setScreen("mine");
              }}
            >
              Benim
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}

function CocktailPreview({
  cocktail,
  variant,
}: {
  cocktail: Cocktail;
  variant: "card" | "hero";
}) {
  const mainColor = cocktail.ingredients[0]?.color ?? "#f59e0b";
  const secondColor = cocktail.ingredients[1]?.color ?? mainColor;

  const isHero = variant === "hero";

  const wrapperStyle: CSSProperties = {
    width: isHero ? 132 : 82,
    height: isHero ? 168 : 104,
    position: "relative",
    display: "grid",
    placeItems: "center",
    filter: isHero
      ? "drop-shadow(0 18px 32px rgba(251,146,60,0.22))"
      : "drop-shadow(0 10px 18px rgba(251,146,60,0.16))",
  };

  return (
    <div style={wrapperStyle}>
      <PreviewGlass
        glassType={cocktail.glassType}
        mainColor={mainColor}
        secondColor={secondColor}
        size={isHero ? "hero" : "card"}
      />
    </div>
  );
}

function PreviewGlass({
  glassType,
  mainColor,
  secondColor,
  size,
}: {
  glassType: GlassType;
  mainColor: string;
  secondColor: string;
  size: "card" | "hero";
}) {
  const scale = size === "hero" ? 1 : 0.62;

  const liquidStyle: CSSProperties = {
    position: "absolute",
    left: 4,
    right: 4,
    bottom: 4,
    height: "66%",
    borderRadius: "inherit",
    background: `linear-gradient(180deg, ${secondColor}, ${mainColor})`,
    opacity: 0.92,
  };

  const shineStyle: CSSProperties = {
    position: "absolute",
    top: "14%",
    left: "22%",
    width: 9 * scale,
    height: "52%",
    borderRadius: 999,
    background: "linear-gradient(180deg, rgba(255,255,255,0.34), transparent)",
    zIndex: 3,
  };

  if (glassType === "highball") {
    return (
      <div
        style={{
          position: "relative",
          width: 74 * scale,
          height: 142 * scale,
          border: "3px solid rgba(255,255,255,0.62)",
          borderTopColor: "rgba(255,255,255,0.82)",
          borderRadius: `${18 * scale}px ${18 * scale}px ${30 * scale}px ${
            30 * scale
          }px`,
          overflow: "hidden",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div style={liquidStyle} />
        <div style={shineStyle} />
      </div>
    );
  }

  if (glassType === "rocks") {
    return (
      <div
        style={{
          position: "relative",
          width: 112 * scale,
          height: 86 * scale,
          marginTop: 44 * scale,
          border: "3px solid rgba(255,255,255,0.62)",
          borderTopColor: "rgba(255,255,255,0.82)",
          borderRadius: `${16 * scale}px ${16 * scale}px ${30 * scale}px ${
            30 * scale
          }px`,
          overflow: "hidden",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ ...liquidStyle, height: "58%" }} />
        <div style={shineStyle} />
      </div>
    );
  }

  if (glassType === "coupe") {
    return (
      <div
        style={{
          position: "relative",
          width: 128 * scale,
          height: 142 * scale,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 8 * scale,
            top: 18 * scale,
            width: 112 * scale,
            height: 58 * scale,
            border: "3px solid rgba(255,255,255,0.62)",
            borderTopColor: "rgba(255,255,255,0.82)",
            borderRadius: `${70 * scale}px ${70 * scale}px ${30 * scale}px ${
              30 * scale
            }px`,
            overflow: "hidden",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ ...liquidStyle, height: "52%" }} />
          <div style={shineStyle} />
        </div>

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 75 * scale,
            width: 7 * scale,
            height: 48 * scale,
            transform: "translateX(-50%)",
            borderRadius: 999,
            background: "rgba(255,255,255,0.66)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 6 * scale,
            width: 74 * scale,
            height: 10 * scale,
            transform: "translateX(-50%)",
            borderRadius: 999,
            background: "rgba(255,255,255,0.66)",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: 132 * scale,
        height: 144 * scale,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 4 * scale,
          top: 22 * scale,
          width: 124 * scale,
          height: 64 * scale,
          clipPath: "polygon(0 0, 100% 0, 67% 100%, 33% 100%)",
          border: "3px solid rgba(255,255,255,0.62)",
          background: `linear-gradient(180deg, transparent 30%, ${secondColor} 31%, ${mainColor})`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 86 * scale,
          width: 7 * scale,
          height: 42 * scale,
          transform: "translateX(-50%)",
          borderRadius: 999,
          background: "rgba(255,255,255,0.66)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 6 * scale,
          width: 78 * scale,
          height: 10 * scale,
          transform: "translateX(-50%)",
          borderRadius: 999,
          background: "rgba(255,255,255,0.66)",
        }}
      />
    </div>
  );
}

export default App;