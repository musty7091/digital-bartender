// Build sonrası: index.html'i 404.html olarak kopyala.
// Böylece GitHub Pages'te derin bir URL yenilendiğinde SPA yine yüklenir.
import { copyFileSync, existsSync } from 'node:fs'
const src = 'dist/index.html'
const dst = 'dist/404.html'
if (existsSync(src)) {
  copyFileSync(src, dst)
  console.log('✓ 404.html oluşturuldu (SPA yenileme desteği)')
}
