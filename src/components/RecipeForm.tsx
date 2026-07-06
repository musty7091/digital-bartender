import { useState } from "react";
import { GLASSES, type Recipe, type IngRow } from "../data/recipes";
import { newCustomId } from "../data/customStore";

// ============================================================
// İmza kokteyli ekleme / düzenleme formu (modal)
// ============================================================

type Draft = {
  n: string;
  g: string;
  m: Recipe["m"];
  ice: NonNullable<Recipe["ice"]>;
  rim: string;
  mudEmoji: string;
  mudLabel: string;
  ings: { label: string; ml: string; color: string; fizzy: boolean; after: boolean }[];
  garEmoji: string;
  garLabel: string;
  d: string;
};

const METHODS: { v: Recipe["m"]; label: string }[] = [
  { v: "build", label: "Bardakta (build)" },
  { v: "stir", label: "Bardakta karıştır (stir)" },
  { v: "shake", label: "Shaker'da çalkala (shake)" },
  { v: "stirup", label: "Karıştırma bardağı (stir up)" },
];

const ICES: { v: NonNullable<Recipe["ice"]>; label: string }[] = [
  { v: "cube", label: "Küp buz" },
  { v: "big", label: "Büyük küp" },
  { v: "crushed", label: "Kırık buz" },
  { v: "none", label: "Buzsuz" },
];

const emptyIng = () => ({
  label: "",
  ml: "30",
  color: "#f59e0b",
  fizzy: false,
  after: false,
});

function recipeToDraft(r?: Recipe): Draft {
  if (!r)
    return {
      n: "",
      g: "highball",
      m: "shake",
      ice: "cube",
      rim: "",
      mudEmoji: "",
      mudLabel: "",
      ings: [emptyIng(), emptyIng()],
      garEmoji: "",
      garLabel: "",
      d: "",
    };
  return {
    n: r.n,
    g: r.g,
    m: r.m,
    ice: r.ice || "cube",
    rim: r.rim || "",
    mudEmoji: r.mud?.[0] || "",
    mudLabel: r.mud?.[2] || "",
    ings: r.ing.map((row) => ({
      label: row[0],
      ml: String(row[1]),
      color: row[2].startsWith("#") ? row[2] : "#f59e0b",
      fizzy: (row[3] || "").includes("f"),
      after: (row[3] || "").includes("a"),
    })),
    garEmoji: r.gar?.[0] || "",
    garLabel: r.gar?.[1] || "",
    d: r.d,
  };
}

function draftToRecipe(d: Draft, id: string): Recipe {
  const ing: IngRow[] = d.ings
    .filter((i) => i.label.trim() && Number(i.ml) > 0)
    .map((i) => {
      let flag = "";
      if (i.after) flag += "a";
      if (i.fizzy) flag += "f";
      return [i.label.trim(), Number(i.ml), i.color, flag || undefined] as IngRow;
    });

  const recipe: Recipe = {
    id,
    n: d.n.trim(),
    cat: "custom",
    g: d.g,
    m: d.m,
    ing,
    d: d.d.trim() || "İmza kokteyli.",
  };
  if (d.ice) recipe.ice = d.ice;
  if (d.rim.trim()) recipe.rim = d.rim.trim();
  if (d.mudLabel.trim())
    recipe.mud = [d.mudEmoji || "🌿", d.mudEmoji || "🌿", d.mudLabel.trim()];
  if (d.garLabel.trim()) recipe.gar = [d.garEmoji || "🍒", d.garLabel.trim()];
  return recipe;
}

export function RecipeForm({
  editing,
  onSave,
  onCancel,
}: {
  editing?: Recipe;
  onSave: (r: Recipe) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(() => recipeToDraft(editing));
  const [error, setError] = useState("");

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setD((p) => ({ ...p, [k]: v }));

  function setIng(i: number, patch: Partial<Draft["ings"][number]>) {
    setD((p) => {
      const ings = p.ings.slice();
      ings[i] = { ...ings[i], ...patch };
      return { ...p, ings };
    });
  }
  const addIng = () => setD((p) => ({ ...p, ings: [...p.ings, emptyIng()] }));
  const removeIng = (i: number) =>
    setD((p) => ({ ...p, ings: p.ings.filter((_, j) => j !== i) }));

  function submit() {
    if (!d.n.trim()) return setError("Kokteyle bir isim ver.");
    const validIngs = d.ings.filter((i) => i.label.trim() && Number(i.ml) > 0);
    if (validIngs.length === 0)
      return setError("En az bir malzeme ekle (isim ve ml).");
    const id = editing ? editing.id : newCustomId();
    onSave(draftToRecipe(d, id));
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title font-neon">
            {editing ? "Kokteyli Düzenle" : "İmza Kokteyli Ekle"}
          </h2>
          <button className="modal-x" onClick={onCancel} aria-label="Kapat">
            ✕
          </button>
        </div>

        <div className="form-body slim-scroll">
          {/* İsim + açıklama */}
          <label className="field">
            <span className="field-label">Kokteyl Adı</span>
            <input
              className="field-input"
              value={d.n}
              onChange={(e) => set("n", e.target.value)}
              placeholder="Örn. Gece Yarısı Ekspresi"
            />
          </label>

          <label className="field">
            <span className="field-label">Kısa Açıklama</span>
            <input
              className="field-input"
              value={d.d}
              onChange={(e) => set("d", e.target.value)}
              placeholder="Bir cümlelik tanıtım (isteğe bağlı)"
            />
          </label>

          {/* Bardak + yöntem */}
          <div className="field-row">
            <label className="field">
              <span className="field-label">Bardak</span>
              <select
                className="field-input"
                value={d.g}
                onChange={(e) => set("g", e.target.value)}
              >
                {Object.entries(GLASSES).map(([k, g]) => (
                  <option key={k} value={k}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Yöntem</span>
              <select
                className="field-input"
                value={d.m}
                onChange={(e) => set("m", e.target.value as Recipe["m"])}
              >
                {METHODS.map((m) => (
                  <option key={m.v} value={m.v}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Buz + kenar */}
          <div className="field-row">
            <label className="field">
              <span className="field-label">Buz</span>
              <select
                className="field-input"
                value={d.ice}
                onChange={(e) =>
                  set("ice", e.target.value as NonNullable<Recipe["ice"]>)
                }
              >
                {ICES.map((i) => (
                  <option key={i.v} value={i.v}>
                    {i.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Kenar Süsü</span>
              <input
                className="field-input"
                value={d.rim}
                onChange={(e) => set("rim", e.target.value)}
                placeholder="Örn. Tuz / Şeker (boş bırakılabilir)"
              />
            </label>
          </div>

          {/* Ezme (muddle) */}
          <div className="field-row">
            <label className="field field-narrow">
              <span className="field-label">Ezme Emoji</span>
              <input
                className="field-input"
                value={d.mudEmoji}
                onChange={(e) => set("mudEmoji", e.target.value)}
                placeholder="🌿"
                maxLength={2}
              />
            </label>
            <label className="field">
              <span className="field-label">Ezilecek Malzeme</span>
              <input
                className="field-input"
                value={d.mudLabel}
                onChange={(e) => set("mudLabel", e.target.value)}
                placeholder="Örn. Nane & Lime (boş = ezme yok)"
              />
            </label>
          </div>

          {/* Malzemeler */}
          <div className="ing-editor">
            <div className="field-label">Malzemeler</div>
            {d.ings.map((ing, i) => (
              <div key={i} className="ing-edit-row">
                <input
                  className="field-input ing-name-in"
                  value={ing.label}
                  onChange={(e) => setIng(i, { label: e.target.value })}
                  placeholder="Malzeme"
                />
                <input
                  className="field-input ing-ml-in"
                  type="number"
                  value={ing.ml}
                  onChange={(e) => setIng(i, { ml: e.target.value })}
                  placeholder="ml"
                  min={0}
                />
                <input
                  className="ing-color-in"
                  type="color"
                  value={ing.color}
                  onChange={(e) => setIng(i, { color: e.target.value })}
                  title="Renk seç"
                />
                <button
                  type="button"
                  className={"chip" + (ing.fizzy ? " chip-on" : "")}
                  onClick={() => setIng(i, { fizzy: !ing.fizzy })}
                  title="Gazlı"
                >
                  Gazlı
                </button>
                <button
                  type="button"
                  className={"chip" + (ing.after ? " chip-on" : "")}
                  onClick={() => setIng(i, { after: !ing.after })}
                  title="Süzdükten sonra eklenir"
                >
                  Sonra
                </button>
                <button
                  type="button"
                  className="ing-del"
                  onClick={() => removeIng(i)}
                  aria-label="Malzemeyi sil"
                  disabled={d.ings.length <= 1}
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="add-ing" onClick={addIng}>
              + Malzeme Ekle
            </button>
          </div>

          {/* Süsleme */}
          <div className="field-row">
            <label className="field field-narrow">
              <span className="field-label">Süs Emoji</span>
              <input
                className="field-input"
                value={d.garEmoji}
                onChange={(e) => set("garEmoji", e.target.value)}
                placeholder="🍒"
                maxLength={2}
              />
            </label>
            <label className="field">
              <span className="field-label">Süsleme</span>
              <input
                className="field-input"
                value={d.garLabel}
                onChange={(e) => set("garLabel", e.target.value)}
                placeholder="Örn. Vişne (boş bırakılabilir)"
              />
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="modal-actions">
          <button className="ctrl" onClick={onCancel}>
            İptal
          </button>
          <button className="ctrl ctrl-play" onClick={submit}>
            {editing ? "Kaydet" : "Ekle"}
          </button>
        </div>
      </div>
    </div>
  );
}
