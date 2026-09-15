// ============================================================
// IndexNow ping ツール（複数プロジェクト共通）
//
// Google Indexing API（notify-indexing.mjs）の対になるもの。あちらはGoogle専用で、
// こちらは **Bing / DuckDuckGo / Yandex など IndexNow 参加エンジン**へ一括通知する。
// 依存ゼロ（Node標準の fetch のみ）。
//
// 🔴 なぜ必要か（2026-09-15に実測して判明）:
//    NineCut（ninecut.app）の直近90日の**購入**の参照元は chatgpt.com 2件・bing 1件で、
//    **Google系は0件**。一方 Googleは32URLのうち9件しかインデックスしておらず、
//    18件が「検出 - インデックス未登録」のまま。
//    **Googleが載せない記事をBingが換金していた**ので、Google側だけ通知していたのは片手落ちだった。
//    ⚠️ ChatGPT検索はBingの索引とOAI-SearchBotの自前クロールを混ぜる（citationの87%が
//       Bing上位と一致）。Bingに載ることはChatGPTに載る前提条件になっている。
//
// 使い方:
//   node notify-indexnow.mjs https://leaguru.jp/blog/foo
//   node notify-indexnow.mjs https://regiato.com/sitemap.xml --filter /blog/
//   node notify-indexnow.mjs https://ninecut.app/sitemap.xml --all
//
// 鍵（IndexNowの鍵は秘密ではない。ドメイン所有の証明にすぎず、公開前提）:
//   --key <文字列> → 環境変数 INDEXNOW_KEY → <このファイルの隣>/indexnow-key.txt
//   **鍵ファイルを https://<ホスト>/<鍵>.txt に置いてデプロイしておくこと。**
//   置き忘れるとAPIは 403 を返す（下の事前確認で先に気づけるようにしてある）。
// ============================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// api.indexnow.org は参加エンジン全体へ配る集約エンドポイント。
// Bing だけに送るなら https://www.bing.com/indexnow でも同じ形。
const ENDPOINT = 'https://api.indexnow.org/indexnow'

const argv = process.argv.slice(2)
let filter = '/blog/'
let all = false
let key = null
let skipCheck = false
const positionals = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--all') all = true
  else if (a === '--filter') filter = argv[++i]
  else if (a === '--key') key = argv[++i]
  else if (a === '--no-key-check') skipCheck = true   // 鍵ファイル公開前の動作確認用
  else positionals.push(a)
}
if (positionals.length === 0) {
  console.error('使い方: node notify-indexnow.mjs <sitemapURL|pageURL...> [--filter /blog/] [--all] [--key <鍵>]')
  process.exit(1)
}

function loadKey() {
  if (key) return key.trim()
  if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY.trim()
  const def = path.join(here, 'indexnow-key.txt')
  if (fs.existsSync(def)) return fs.readFileSync(def, 'utf8').trim()
  console.error(`\n[indexnow] 鍵が見つかりません。
  → ${def} に鍵を書くか、--key / INDEXNOW_KEY を指定してください。
  鍵は8〜128文字の英数字とハイフンのみ。生成例: openssl rand -hex 16\n`)
  process.exit(1)
}

async function fetchSitemapUrls(sitemapUrl) {
  const res = await fetch(sitemapUrl)
  if (!res.ok) throw new Error(`sitemap取得失敗: ${sitemapUrl} (${res.status})`)
  const xml = await res.text()
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
  return all ? locs : locs.filter((u) => u.includes(filter))
}

const urls = []
for (const p of positionals) {
  if (p.endsWith('.xml')) urls.push(...(await fetchSitemapUrls(p)))
  else urls.push(p)
}
const targets = [...new Set(urls)]
if (targets.length === 0) { console.log('[indexnow] 対象URLなし'); process.exit(0) }

// ⚠️ ホストが混ざると 422（URLs which don't belong to the host）になる。先に弾く。
const hosts = [...new Set(targets.map((u) => new URL(u).host))]
if (hosts.length > 1) {
  console.error(`[indexnow] 複数ホストが混在しています（${hosts.join(', ')}）。IndexNowは1リクエスト1ホスト。`)
  process.exit(1)
}
const host = hosts[0]
const k = loadKey()
const keyLocation = `https://${host}/${k}.txt`

// 鍵ファイルの事前確認。**ここを省くと 403 が返るだけで、原因が分からないまま毎日失敗する**
if (!skipCheck) {
  try {
    const r = await fetch(keyLocation)
    const body = r.ok ? (await r.text()).trim() : ''
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    if (body !== k) throw new Error(`中身が鍵と一致しない（先頭: ${body.slice(0, 16)}）`)
  } catch (e) {
    console.error(`\n[indexnow] 鍵ファイルが公開されていません: ${keyLocation}
  理由: ${e.message}
  → 鍵と同じ文字列だけを書いたテキストファイルをその場所に置いてデプロイしてください。
    （置かないとAPIは403を返します。--no-key-check で確認を飛ばせます）\n`)
    process.exit(1)
  }
}

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key: k, keyLocation, urlList: targets }),
})

// 公式の意味づけ。202は「受け付けたが鍵の検証は保留」で、失敗ではない
const MEANING = {
  200: '受理',
  202: '受理（鍵の検証は保留中）',
  400: 'リクエストの形式が不正',
  403: '鍵が無効（鍵ファイルが見つからない）',
  422: 'URLがホストに属していない、または鍵が一致しない',
  429: '送信しすぎ（スパムと判定）',
}
const meaning = MEANING[res.status] || '不明な応答'
const detail = await res.text().catch(() => '')

if (res.status === 200 || res.status === 202) {
  console.log(`[indexnow] ✓ ${res.status} ${meaning} — ${host} に ${targets.length}件を通知`)
  for (const u of targets) console.log(`[indexnow]   ${u}`)
} else {
  console.error(`[indexnow] ✗ ${res.status} ${meaning}${detail ? ` — ${detail.slice(0, 200)}` : ''}`)
  process.exit(1)
}
