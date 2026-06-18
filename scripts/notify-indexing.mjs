// ============================================================
// Google Indexing API にURL更新を通知してクロールを催促する。
// 依存ゼロ（Node標準の crypto / fetch のみ）。
//
// 使い方:
//   node scripts/notify-indexing.mjs                 # 全ブログ記事URLを通知
//   node scripts/notify-indexing.mjs <URL> <URL>...  # 指定URLだけ通知
//   npm run notify-index
//
// 認証鍵（サービスアカウントJSON）の渡し方（どちらか）:
//   - 環境変数 GOOGLE_INDEXING_KEY に JSON 文字列を入れる
//   - scripts/indexing-key.json に置く（.gitignore 済み）
//
// 初回セットアップ手順は README 末尾コメント参照。
// ============================================================
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = 'https://leaguru.jp'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadKey() {
  if (process.env.GOOGLE_INDEXING_KEY) {
    try { return JSON.parse(process.env.GOOGLE_INDEXING_KEY) } catch { throw new Error('GOOGLE_INDEXING_KEY が不正なJSONです') }
  }
  const file = path.join(root, 'scripts/indexing-key.json')
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
  console.error(`\n[notify-index] サービスアカウント鍵が見つかりません。
  → 環境変数 GOOGLE_INDEXING_KEY にJSONを入れるか、scripts/indexing-key.json を置いてください。
  （初回セットアップ: GCPでサービスアカウント作成+Indexing API有効化 → そのアカウントをGSCの「所有者」に追加 → 鍵JSONを取得）\n`)
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
  const signature = b64url(signer.sign(key.private_key))
  const jwt = `${signingInput}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`トークン取得失敗: ${res.status} ${JSON.stringify(data)}`)
  return data.access_token
}

function blogUrls() {
  const dir = path.join(root, 'content/blog')
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => `${SITE}/blog/${f.replace(/\.md$/, '')}`)
}

async function notify(token, url) {
  const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, type: 'URL_UPDATED' }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { url, ok: false, info: `${res.status} ${JSON.stringify(data)}` }
  return { url, ok: true }
}

const args = process.argv.slice(2)
const urls = args.length ? args : blogUrls()

const key = loadKey()
const token = await getAccessToken(key)

let ok = 0
for (const url of urls) {
  const r = await notify(token, url)
  if (r.ok) { ok++; console.log(`[notify-index] ✓ ${r.url}`) }
  else console.error(`[notify-index] ✗ ${r.url} — ${r.info}`)
}
console.log(`[notify-index] 完了: ${ok}/${urls.length} 件を通知`)
