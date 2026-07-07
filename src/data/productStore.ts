// ============================================================
// DİJİTAL BARMEN — ÖNERİLEN ÜRÜNLER DEPOSU (IndexedDB)
// Market kioskları için: her kokteyle özel önerilen ürünler.
// Fotoğraflar sıkıştırılıp cihazda saklanır → çevrimdışı çalışır.
// ============================================================

export type Product = {
  id: string;
  recipeId: string; // hangi kokteyle önerildiği
  name: string; // ürün adı (örn. "X Marka London Dry Gin 70cl")
  note: string; // reyon/raf bilgisi (örn. "İçecek reyonu, Raf 4B")
  price: string; // serbest metin (örn. "849,90 ₺") — boş olabilir
  img: string; // sıkıştırılmış dataURL (jpeg)
};

const DB_NAME = "dijitalBarmen";
const DB_VERSION = 2;
const STORE = "products";
const FINALS = "finals";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("recipeId", "recipeId", { unique: false });
      }
      // v2: kokteyl başına final (gerçek kokteyl) fotoğrafı
      if (!db.objectStoreNames.contains(FINALS)) {
        db.createObjectStore(FINALS, { keyPath: "recipeId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadProducts(): Promise<Product[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as Product[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function upsertProduct(p: Product): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(p);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function newProductId(): string {
  return "prod_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Fotoğrafı küçültüp sıkıştır (kiosk depolaması için ideal boyut)
export function compressImage(file: File, maxSize = 640): Promise<string> {
  return loadToCanvas(file, maxSize).then(({ canvas }) =>
    canvas.toDataURL("image/jpeg", 0.82)
  );
}

// ------------------------------------------------------------
// ARKA PLAN TEMİZLEME
// Ürün fotoğrafları genelde düz (beyaz/açık) fonludur. Kenarlardan
// başlayan taşma dolgusu (flood fill), fon rengine yakın ve kenara
// bağlantılı pikselleri şeffaflaştırır. Ürünün içindeki benzer
// renkler korunur (kenara bağlı olmadıkları için).
// ------------------------------------------------------------
export function processProductImage(
  file: File,
  removeBg: boolean,
  maxSize = 560
): Promise<string> {
  if (!removeBg) return compressImage(file, maxSize);
  return loadToCanvas(file, maxSize).then(({ canvas, ctx }) => {
    const { width: w, height: h } = canvas;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    // Fon rengini 4 köşeden örnekle (ortalama)
    const corner = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      return [d[i], d[i + 1], d[i + 2]];
    };
    const samples = [
      corner(0, 0),
      corner(w - 1, 0),
      corner(0, h - 1),
      corner(w - 1, h - 1),
      corner(Math.floor(w / 2), 0),
      corner(Math.floor(w / 2), h - 1),
    ];
    const bg = [0, 1, 2].map(
      (c) => samples.reduce((s, p) => s + p[c], 0) / samples.length
    );

    const TOL = 42; // fon benzerlik eşiği
    const SOFT = 70; // yumuşak kenar eşiği
    const distTo = (i: number) => {
      const dr = d[i] - bg[0],
        dg = d[i + 1] - bg[1],
        db = d[i + 2] - bg[2];
      return Math.sqrt(dr * dr + dg * dg + db * db);
    };

    // Kenarlardan BFS taşma dolgusu
    const visited = new Uint8Array(w * h);
    const queue: number[] = [];
    const push = (x: number, y: number) => {
      const p = y * w + x;
      if (visited[p]) return;
      if (distTo(p * 4) < TOL) {
        visited[p] = 1;
        queue.push(p);
      }
    };
    for (let x = 0; x < w; x++) {
      push(x, 0);
      push(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      push(0, y);
      push(w - 1, y);
    }
    while (queue.length) {
      const p = queue.pop()!;
      const x = p % w,
        y = (p / w) | 0;
      d[p * 4 + 3] = 0; // şeffaflaştır
      if (x > 0) push(x - 1, y);
      if (x < w - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < h - 1) push(x, y + 1);
    }

    // Yumuşak kenar: fona yakın ama silinmemiş kenar pikselleri kısmen saydam
    for (let p = 0; p < w * h; p++) {
      if (visited[p]) continue;
      // sadece silinen bölgeye komşu pikseller
      const x = p % w,
        y = (p / w) | 0;
      const nearCleared =
        (x > 0 && visited[p - 1]) ||
        (x < w - 1 && visited[p + 1]) ||
        (y > 0 && visited[p - w]) ||
        (y < h - 1 && visited[p + w]);
      if (!nearCleared) continue;
      const dist = distTo(p * 4);
      if (dist < SOFT) {
        const a = Math.round(
          255 * Math.min(1, Math.max(0, (dist - TOL) / (SOFT - TOL)))
        );
        d[p * 4 + 3] = Math.min(d[p * 4 + 3], a);
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/png"); // şeffaflık için PNG
  });
}

function loadToCanvas(
  file: File,
  maxSize: number
): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Dosya okunamadı"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Görsel çözümlenemedi"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return reject(new Error("Canvas desteklenmiyor"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ canvas, ctx });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

// ------------------------------------------------------------
// FİNAL FOTOĞRAFLARI — kokteyl hazır olunca gösterilen gerçek görsel
// ------------------------------------------------------------
export async function loadFinal(recipeId: string): Promise<string | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(FINALS, "readonly");
      const req = tx.objectStore(FINALS).get(recipeId);
      req.onsuccess = () =>
        resolve((req.result as { img: string } | undefined)?.img ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function saveFinal(recipeId: string, img: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FINALS, "readwrite");
    tx.objectStore(FINALS).put({ recipeId, img });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteFinal(recipeId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FINALS, "readwrite");
    tx.objectStore(FINALS).delete(recipeId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Fiyatı her zaman ₺ ile biçimle: "2299.99" → "2299.99₺"
export function formatPrice(p: string): string {
  const clean = p.replace(/[₺TLtl\s]+/g, "").trim();
  if (!clean) return "";
  return `${clean}₺`;
}

// ---- Admin PIN (kiosk sahibinin yönetim şifresi) ----
const PIN_KEY = "dijitalBarmen.adminPin.v1";
const DEFAULT_PIN = "4321";

export function getAdminPin(): string {
  return localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
}
export function setAdminPin(pin: string): void {
  localStorage.setItem(PIN_KEY, pin);
}
