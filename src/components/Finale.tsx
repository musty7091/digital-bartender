import { useState } from "react";
import type { Recipe } from "../data/recipes";

// ============================================================
// FİNAL EKRANI — animasyon bitince gerçek kokteyl fotoğrafına
// sinematik geçiş. Fotoğraf radyal maskeyle koyu zemine eritilir,
// böylece hangi fotoğraf yüklenirse yüklensin geçiş pürüzsüz olur.
// Fotoğraf kaynağı: admin'den yüklenen (IndexedDB) → yoksa
// public/finals/<id>.jpg → o da yoksa fotoğrafsız zarif final.
// ============================================================

export function Finale({
  recipe,
  photo, // IndexedDB'den gelen (öncelikli) — yoksa null
  onReplay,
}: {
  recipe: Recipe;
  photo: string | null;
  onReplay: () => void;
}) {
  // Statik yedek: public/finals/<id>.jpg (Alexander örneği gömülü)
  const staticSrc = import.meta.env.BASE_URL + "finals/" + recipe.id + ".jpg";
  const [staticFailed, setStaticFailed] = useState(false);
  const src = photo || (staticFailed ? null : staticSrc);

  return (
    <div className="finale" key={recipe.id}>
      {src && (
        <img
          className="finale-img"
          src={src}
          alt={recipe.n}
          onError={() => !photo && setStaticFailed(true)}
        />
      )}
      <div className={"finale-caption" + (src ? "" : " finale-caption-solo")}>
        <span className="finale-sparkle">✨</span>
        <h3 className="finale-name font-neon">{recipe.n}</h3>
        <p className="finale-cheers neon-amber">Şerefe! 🥂</p>
        <button className="ctrl finale-replay" onClick={onReplay}>
          ↻ Tekrar izle
        </button>
      </div>
    </div>
  );
}
