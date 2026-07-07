import { useEffect, useMemo, useState } from "react";
import type { Recipe } from "../data/recipes";
import {
  type Product,
  loadProducts,
  upsertProduct,
  deleteProduct,
  newProductId,
  processProductImage,
  formatPrice,
  compressImage,
  loadFinal,
  saveFinal,
  deleteFinal,
  getAdminPin,
  setAdminPin,
} from "../data/productStore";

// ============================================================
// ÜRÜN YÖNETİMİ (admin) — #admin ile açılır, PIN korumalı.
// Market çalışanı: kokteyl seçer → önerilen ürünleri yönetir.
// ============================================================

export function ProductAdmin({
  recipes,
  onClose,
}: {
  recipes: Recipe[];
  onClose: () => void;
}) {
  const [authed, setAuthed] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const [all, setAll] = useState<Product[]>([]);
  const [recipeId, setRecipeId] = useState(recipes[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [removeBg, setRemoveBg] = useState(true); // arka planı otomatik temizle
  const [finalImg, setFinalImg] = useState<string | null>(null);

  // Form alanları
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [price, setPrice] = useState("");
  const [img, setImg] = useState("");
  const [formError, setFormError] = useState("");

  // PIN değiştirme
  const [newPin, setNewPin] = useState("");

  useEffect(() => {
    if (!authed) return;
    let on = true;
    loadProducts().then((list) => {
      if (on) setAll(list);
    });
    return () => {
      on = false;
    };
  }, [authed]);

  const current = useMemo(
    () => all.filter((p) => p.recipeId === recipeId),
    [all, recipeId]
  );

  // Seçili kokteylin final fotoğrafını getir
  useEffect(() => {
    if (!authed || !recipeId) return;
    let on = true;
    loadFinal(recipeId).then((img) => {
      if (on) setFinalImg(img);
    });
    return () => {
      on = false;
    };
  }, [authed, recipeId]);

  async function onFinalFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const img = await compressImage(f, 900);
      await saveFinal(recipeId, img);
      setFinalImg(img);
    } catch {
      window.alert("Fotoğraf işlenemedi.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function removeFinal() {
    if (!window.confirm("Final fotoğrafını silmek istediğine emin misin?"))
      return;
    await deleteFinal(recipeId);
    setFinalImg(null);
  }

  function tryAuth() {
    if (pinInput === getAdminPin()) {
      setAuthed(true);
      setPinError("");
    } else {
      setPinError("PIN hatalı.");
    }
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setNote("");
    setPrice("");
    setImg("");
    setFormError("");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      setImg(await processProductImage(f, removeBg));
      setFormError("");
    } catch {
      setFormError("Fotoğraf işlenemedi. Farklı bir dosya deneyin.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function save() {
    if (!name.trim()) return setFormError("Ürün adı gerekli.");
    if (!img) return setFormError("Ürün fotoğrafı ekleyin.");
    const p: Product = {
      id: editingId || newProductId(),
      recipeId,
      name: name.trim(),
      note: note.trim(),
      price: formatPrice(price),
      img,
    };
    setBusy(true);
    try {
      await upsertProduct(p);
      setAll(await loadProducts());
      resetForm();
    } catch {
      setFormError("Kaydedilemedi (depolama dolu olabilir).");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setName(p.name);
    setNote(p.note);
    setPrice(p.price);
    setImg(p.img);
    setFormError("");
  }

  async function remove(id: string) {
    if (!window.confirm("Bu ürünü silmek istediğine emin misin?")) return;
    await deleteProduct(id);
    setAll(await loadProducts());
    if (editingId === id) resetForm();
  }

  function changePin() {
    const p = newPin.trim();
    if (!/^\d{4,8}$/.test(p)) {
      window.alert("PIN 4-8 haneli rakam olmalı.");
      return;
    }
    setAdminPin(p);
    setNewPin("");
    window.alert("PIN güncellendi.");
  }

  // ---------- PIN ekranı ----------
  if (!authed) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal glass-panel pin-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-head">
            <h2 className="modal-title font-neon">Yönetim</h2>
            <button className="modal-x" onClick={onClose} aria-label="Kapat">
              ✕
            </button>
          </div>
          <div className="form-body">
            <label className="field">
              <span className="field-label">Yönetici PIN</span>
              <input
                className="field-input"
                type="password"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && tryAuth()}
                placeholder="••••"
                autoFocus
              />
            </label>
            {pinError && <p className="form-error">{pinError}</p>}
          </div>
          <div className="modal-actions">
            <button className="ctrl ctrl-play" onClick={tryAuth}>
              Giriş
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Yönetim ekranı ----------
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal glass-panel admin-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 className="modal-title font-neon">Önerilen Ürünler</h2>
          <button className="modal-x" onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </div>

        <div className="form-body slim-scroll">
          <label className="field">
            <span className="field-label">Kokteyl</span>
            <select
              className="field-input"
              value={recipeId}
              onChange={(e) => {
                setRecipeId(e.target.value);
                resetForm();
              }}
            >
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.n}
                </option>
              ))}
            </select>
          </label>

          {/* Mevcut ürünler */}
          {current.length > 0 && (
            <div className="admin-list">
              {current.map((p) => (
                <div key={p.id} className="admin-item">
                  <img className="admin-thumb" src={p.img} alt={p.name} />
                  <div className="admin-item-info">
                    <span className="admin-item-name">{p.name}</span>
                    {p.note && (
                      <span className="admin-item-note">{p.note}</span>
                    )}
                    {p.price && (
                      <span className="admin-item-price">{p.price}</span>
                    )}
                  </div>
                  <div className="admin-item-actions">
                    <button className="mini-btn" onClick={() => startEdit(p)}>
                      ✎
                    </button>
                    <button
                      className="mini-btn mini-danger"
                      onClick={() => remove(p.id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {current.length === 0 && (
            <p className="empty">Bu kokteyl için henüz ürün eklenmemiş.</p>
          )}

          {/* Ekleme/düzenleme formu */}
          <div className="admin-form">
            <div className="field-label">
              {editingId ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
            </div>
            <label className="field">
              <span className="field-label">Ürün Adı</span>
              <input
                className="field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn. London Dry Gin 70cl"
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span className="field-label">Reyon / Raf</span>
                <input
                  className="field-input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Örn. İçecek reyonu, Raf 4B"
                />
              </label>
              <label className="field field-narrow2">
                <span className="field-label">Fiyat</span>
                <input
                  className="field-input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="2299.99"
                />
              </label>
            </div>

            <div className="img-upload-row">
              <label className="ctrl img-upload-btn">
                📷 Fotoğraf {img ? "Değiştir" : "Yükle"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFile}
                  hidden
                />
              </label>
              {img && (
                <img className="img-preview checker" src={img} alt="Önizleme" />
              )}
            </div>
            <label className="bg-toggle">
              <input
                type="checkbox"
                checked={removeBg}
                onChange={(e) => setRemoveBg(e.target.checked)}
              />
              <span>
                Arka planı otomatik temizle{" "}
                <em>(düz fonlu ürün fotoğrafları için)</em>
              </span>
            </label>

            {formError && <p className="form-error">{formError}</p>}

            <div className="admin-form-actions">
              {editingId && (
                <button className="ctrl" onClick={resetForm}>
                  Vazgeç
                </button>
              )}
              <button
                className="ctrl ctrl-play"
                onClick={save}
                disabled={busy}
              >
                {busy ? "..." : editingId ? "Kaydet" : "Ekle"}
              </button>
            </div>
          </div>

          {/* Final fotoğrafı */}
          <div className="admin-form">
            <div className="field-label">
              🥂 Final Fotoğrafı{" "}
              <em className="field-hint">
                (tarif bitince gösterilen gerçek kokteyl görseli)
              </em>
            </div>
            <div className="img-upload-row">
              <label className="ctrl img-upload-btn">
                📷 {finalImg ? "Değiştir" : "Fotoğraf Yükle"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFinalFile}
                  hidden
                />
              </label>
              {finalImg && (
                <>
                  <img
                    className="img-preview"
                    src={finalImg}
                    alt="Final önizleme"
                  />
                  <button className="mini-btn mini-danger" onClick={removeFinal}>
                    🗑
                  </button>
                </>
              )}
            </div>
          </div>

          {/* PIN değiştirme */}
          <div className="admin-pin-row">
            <input
              className="field-input"
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="Yeni PIN (4-8 hane)"
            />
            <button className="ctrl" onClick={changePin}>
              PIN Değiştir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
