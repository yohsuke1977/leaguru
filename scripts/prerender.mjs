// ビルド後プリレンダリング。
// dist/index.html（空の#root）を雛形に、各ルートをサーバーレンダリングして
// 本文込みの静的HTMLを書き出す。Googlebot に本文入りHTMLを返すのが目的。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

// プリレンダリング対象（/success は決済後ページなのでSEO不要・除外）
const routes = ['/', '/operator', '/contact', '/terms', '/privacy', '/tokusho']

const template = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8')
if (!template.includes('<div id="root"></div>')) {
  console.error('[prerender] dist/index.html に <div id="root"></div> が見つかりません。中止します。')
  process.exit(1)
}

const { render } = await import(path.join(root, 'dist-server/entry-server.js'))

let ok = 0
for (const url of routes) {
  try {
    const appHtml = render(url)
    const html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
    const outPath = url === '/'
      ? path.join(root, 'dist/index.html')
      : path.join(root, 'dist', url.slice(1), 'index.html')
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, html)
    console.log(`[prerender] ✓ ${url} -> ${path.relative(root, outPath)} (${appHtml.length} bytes)`)
    ok++
  } catch (err) {
    // 個別ルートの失敗はビルドを止めず、そのルートだけSPAフォールバックに任せる
    console.warn(`[prerender] ✗ ${url} スキップ:`, err.message)
  }
}
console.log(`[prerender] 完了: ${ok}/${routes.length} ルート`)
