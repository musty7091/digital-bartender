import { useState } from "react";
import type { Product } from "../data/productStore";

// ============================================================
// Önerilen ürünler şeridi — seçili kokteyle bağlı ürün kartları.
// Karta tıklanınca ürün görseli büyütülür (lightbox).
// ============================================================

export function ProductStrip({ products }: { products: Product[] }) {
  const [zoom, setZoom] = useState<Product | null>(null);

  if (products.length === 0) return null;
  return (
    <section className="prod-section">
      <h3 className="detail-title">🛒 Bu Kokteyl İçin Önerilen Ürünler</h3>
      <div className="prod-strip slim-scroll">
        {products.map((p) => (
          <button
            key={p.id}
            className="prod-card"
            onClick={() => setZoom(p)}
            aria-label={`${p.name} — büyüt`}
          >
            <div className="prod-img-wrap">
              <img className="prod-img" src={p.img} alt={p.name} />
            </div>
            <div className="prod-info">
              <span className="prod-name">{p.name}</span>
              {p.note && <span className="prod-note">📍 {p.note}</span>}
              {p.price && <span className="prod-price">{p.price}</span>}
            </div>
          </button>
        ))}
      </div>

      {zoom && (
        <div className="lightbox" onClick={() => setZoom(null)}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-x lightbox-x"
              onClick={() => setZoom(null)}
              aria-label="Kapat"
            >
              ✕
            </button>
            <img className="lightbox-img" src={zoom.img} alt={zoom.name} />
            <div className="lightbox-info">
              <span className="lightbox-name">{zoom.name}</span>
              {zoom.note && <span className="lightbox-note">📍 {zoom.note}</span>}
              {zoom.price && (
                <span className="lightbox-price neon-amber">{zoom.price}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
