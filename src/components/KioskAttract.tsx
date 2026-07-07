import { useEffect, useMemo, useState } from "react";
import type { Recipe } from "../data/recipes";
import type { Product } from "../data/productStore";

// ============================================================
// KİOSK CAZİBE EKRANI — boşta kalınca dönen tanıtım.
// Kokteyl + o kokteyle önerilen ürünleri sırayla gösterir.
// Dokununca kapanır ve uygulamaya girilir.
// ============================================================

const ROTATE_MS = 6000;

export function KioskAttract({
  recipes,
  products,
  onEnter,
}: {
  recipes: Recipe[];
  products: Product[];
  onEnter: (r: Recipe) => void;
}) {
  // Ürünü olan kokteyller öncelikli; yoksa tüm listeden döner
  const featured = useMemo(() => {
    const withProducts = recipes.filter((r) =>
      products.some((p) => p.recipeId === r.id)
    );
    return withProducts.length > 0 ? withProducts : recipes;
  }, [recipes, products]);

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = window.setInterval(
      () => setIdx((i) => (i + 1) % featured.length),
      ROTATE_MS
    );
    return () => window.clearInterval(t);
  }, [featured.length]);

  const recipe = featured[idx % featured.length];
  const prods = products.filter((p) => p.recipeId === recipe.id).slice(0, 3);

  return (
    <div className="kiosk-attract" onPointerDown={() => onEnter(recipe)}>
      <div className="ka-inner" key={recipe.id}>
        <div className="brand big">
          <span className="neon-amber neon-flicker">Dijital</span>{" "}
          <span className="neon-rose">Barmen</span>
        </div>

        <p className="ka-tag">Bu akşam ne hazırlıyorsun?</p>

        <h2 className="ka-recipe font-neon">{recipe.n}</h2>
        <p className="ka-desc">{recipe.d}</p>

        {prods.length > 0 && (
          <div className="ka-products">
            {prods.map((p) => (
              <div key={p.id} className="ka-prod">
                <img src={p.img} alt={p.name} />
                <span className="ka-prod-name">{p.name}</span>
                {p.price && <span className="ka-prod-price">{p.price}</span>}
              </div>
            ))}
          </div>
        )}

        <div className="ka-cta neon-amber">👆 Dokun ve tarifi izle</div>

        <div className="ka-dots">
          {featured.slice(0, 12).map((_, i) => (
            <span
              key={i}
              className={"ka-dot" + (i === idx % featured.length ? " on" : "")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
