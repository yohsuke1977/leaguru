// ============================================================
// Google Indexing API ping ツール（複数プロジェクト共通）
// ライブの sitemap.xml を読み、blog 記事URLにクロール催促を通知する。
// 依存ゼロ（Node標準の crypto / fetch）。
//
// 使い方:
//   node notify-indexing.mjs <sitemapURL> [--filter /blog/] [--all]
//   node notify-indexing.mjs https://leaguru.jp/sitemap.xml
//   node notify-indexing.mjs https://regiato.com/sitemap.xml
//   node notify-indexing.mjs https://site/blog/foo https://site/blog/bar   # 直接URL指定
//
// 引数:
//   - 末尾 .xml の引数 = sitemap として取得・解析（--filter で絞る、既定 /blog/）
//   - それ以外のURL引数 = そのまま通知（フィルタ無視）
//   - --all : sitemap の全URLを通知（フィルタ無効）
//   - --filter <substr> : sitemap から拾うURLの部分一致条件（既定 /blog/）
//   - --key <path> : サービスアカウント鍵JSONのパス
//
// 認証鍵（同一サービスアカウントを各サイトのGSCに「オーナー」追加しておく）:
//   --key 指定 → 環境変数 GOOGLE_INDEXING_KEY(JSON) → 既定 <このファイルの隣>/indexing-key.json
// ============================================================
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// ── 引数パース ──
const argv = process.argv.slice(2)
let filter = '/blog/'
let all = false
let keyPath = null
const positionals = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--all') all = true
  else if (a === '--filter') filter = argv[++i]
  else if (a === '--key') keyPath = argv[++i]
  else positionals.push(a)
}
if (positionals.length === 0) {
  console.error('使い方: node notify-indexing.mjs <sitemapURL|pageURL...> [--filter /blog/] [--all] [--key path]')
  process.exit(1)
}

// ── 鍵読み込み ──
function loadKey() {
  if (keyPath) return JSON.parse(fs.readFileSync(keyPath, 'utf8'))
  if (process.env.GOOGLE_INDEXING_KEY) return JSON.parse(process.env.GOOGLE_INDEXING_KEY)
  const def = path.join(here, 'indexing-key.json')
  if (fs.existsSync(def)) return JSON.parse(fs.readFileSync(def, 'utf8'))
  console.error(`\n[notify-index] サービスアカウント鍵が見つかりません。
  → ${def} に鍵JSONを置くか、--key / GOOGLE_INDEXING_KEY を指定してください。
  （同一サービスアカウントを各サイトの Search Console に「オーナー」追加しておくこと）\n`)
  process.exit(1)
}

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function getAccessToken(key) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(signingInput)
  signer.end()
  const jwt = `${signingInput}.${b64url(signer.sign(key.private_key))}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`トークン取得失敗: ${res.status} ${JSON.stringify(data)}`)
  return data.access_token
}

async function fetchSitemapUrls(sitemapUrl) {
  const res = await fetch(sitemapUrl)
  if (!res.ok) throw new Error(`sitemap取得失敗: ${sitemapUrl} (${res.status})`)
  const xml = await res.text()
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
  return all ? locs : locs.filter((u) => u.includes(filter))
}

async function notify(token, url) {
  const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, type: 'URL_UPDATED' }),
  })
  const data = await res.json().catch(() => ({}))
  return res.ok ? { url, ok: true } : { url, ok: false, info: `${res.status} ${JSON.stringify(data)}` }
}

// ── URL収集 ──
const urls = []
for (const p of positionals) {
  if (p.endsWith('.xml')) urls.push(...(await fetchSitemapUrls(p)))
  else urls.push(p)
}
const targets = [...new Set(urls)]
if (targets.length === 0) { console.log('[notify-index] 対象URLなし'); process.exit(0) }

const key = loadKey()
const token = await getAccessToken(key)
let ok = 0
for (const url of targets) {
  const r = await notify(token, url)
  if (r.ok) { ok++; console.log(`[notify-index] ✓ ${r.url}`) }
  else console.error(`[notify-index] ✗ ${r.url} — ${r.info}`)
}
console.log(`[notify-index] 完了: ${ok}/${targets.length} 件を通知`)
