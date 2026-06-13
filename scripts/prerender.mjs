// ビルド後プリレンダリング。
// dist/index.html（空の#root）を雛形に、各ルートをサーバーレンダリングして
// 本文込みの静的HTMLを書き出す。Googlebot に本文入りHTMLを返すのが目的。
// ブログ記事はページ別の <title>/description/canonical/OGP も差し込む。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const SITE = 'https://leaguru.jp'

const template = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8')
if (!template.includes('<div id="root"></div>')) {
  console.error('[prerender] dist/index.html に <div id="root"></div> が見つかりません。中止します。')
  process.exit(1)
}

const { render, getMeta, posts } = await import(path.join(root, 'dist-server/entry-server.js'))

// 静的ルート（/success は決済後ページなのでSEO不要・除外）＋ ブログ記事を動的に追加
const baseRoutes = ['/', '/operator', '/contact', '/blog', '/terms', '/privacy', '/tokusho']
const blogRoutes = posts.map((p) => `/blog/${p.slug}`)
const routes = [...baseRoutes, ...blogRoutes]

const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')

function applyHead(html, url) {
  const canonical = url === '/' ? SITE : SITE + url
  html = html.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" />`)
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonical}$2`)

  const meta = getMeta(url)
  if (meta) {
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escHtml(meta.title)}</title>`)
    const d = escAttr(meta.description)
    html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${d}$2`)
    html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escAttr(meta.title)}$2`)
    html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${d}$2`)
    html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escAttr(meta.title)}$2`)
    html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${d}$2`)
  }
  return html
}

let ok = 0
for (const url of routes) {
  try {
    const appHtml = render(url)
    let html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
    html = applyHead(html, url)
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

// sitemap.xml を全ルートから自動生成
const sitemapEntries = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/blog', changefreq: 'weekly', priority: '0.8' },
  { loc: '/operator', changefreq: 'monthly', priority: '0.5' },
  { loc: '/contact', changefreq: 'monthly', priority: '0.7' },
  ...posts.map((p) => ({ loc: `/blog/${p.slug}`, changefreq: 'monthly', priority: '0.7', lastmod: p.date })),
  { loc: '/terms', changefreq: 'yearly', priority: '0.3' },
  { loc: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { loc: '/tokusho', changefreq: 'yearly', priority: '0.3' },
]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (e) =>
      `  <url>\n    <loc>${SITE}${e.loc}</loc>\n${e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : ''}    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
  )
  .join('\n')}
</urlset>
`
fs.writeFileSync(path.join(root, 'dist/sitemap.xml'), sitemap)
console.log(`[prerender] 完了: ${ok}/${routes.length} ルート / sitemap ${sitemapEntries.length} URL`)
