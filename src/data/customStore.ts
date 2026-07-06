// ============================================================
// DİJİTAL BARMEN — İMZA KOKTEYLLERİ (kullanıcı, localStorage)
// Kullanıcının kendi eklediği tarifler yalnızca kendi cihazında
// saklanır. Hazır 92 tarifle aynı Recipe yapısını kullanır, böylece
// animasyon motoru hiç değişmeden çalışır.
// ============================================================

import type { Recipe } from "./recipes";

const STORE_KEY = "dijitalBarmen.custom.v1";

// Tüm imza kokteyllerini oku
export function loadCustom(): Recipe[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as Recipe[]) : [];
  } catch {
    return [];
  }
}

// Tümünü yaz
function saveAll(list: Recipe[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    // kota dolu / gizli mod: sessizce geç
  }
}

// Yeni imza kokteyli için benzersiz id üret
export function newCustomId(): string {
  return "custom_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Ekle veya güncelle (id varsa günceller)
export function upsertCustom(recipe: Recipe): Recipe[] {
  const list = loadCustom();
  const i = list.findIndex((r) => r.id === recipe.id);
  if (i >= 0) list[i] = recipe;
  else list.push(recipe);
  saveAll(list);
  return list;
}

// Sil
export function deleteCustom(id: string): Recipe[] {
  const list = loadCustom().filter((r) => r.id !== id);
  saveAll(list);
  return list;
}

export function isCustom(id: string): boolean {
  return id.startsWith("custom_");
}
