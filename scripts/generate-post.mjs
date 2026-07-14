#!/usr/bin/env node
// ブログ記事を1本 自動生成して content/blog/{slug}.md に書き出す。
// Claude(Anthropic) API で Leaguru のブログ型に厳密に沿った記事を生成し、
// 安全ゲート（検品）に合格したものだけ書き出す。合格しなければ exit 1（公開しない）。
//
// 使い方:
//   node scripts/generate-post.mjs            # queueの次トピックを1本生成
//   node scripts/generate-post.mjs "任意のトピック/キーワード"
//
// 必要env: ANTHROPIC_API_KEY（leaguru/.env or GitHub Secret）。任意: BLOG_MODEL

import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const BLOG_DIR = path.join(ROOT, 'content/blog');
const QUEUE = path.join(ROOT, 'content/blog-queue.json');
const MODEL = process.env.BLOG_MODEL || 'claude-sonnet-4-6';

// --- .env 読み込み（ローカル用・CIはSecretで注入される） ---
function loadEnv(p) {
  try {
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  } catch { /* .envなしでもCIならenv有り */ }
}
loadEnv(path.join(ROOT, '.env'));

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('ANTHROPIC_API_KEY 未設定'); process.exit(1); }

// --- 既存記事（重複回避） ---
const existing = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
const existingSlugs = new Set(existing.map((f) => f.replace(/\.md$/, '')));
const existingPosts = existing.map((f) => {
  const src = fs.readFileSync(path.join(BLOG_DIR, f), 'utf8');
  const title = (src.match(/^title:\s*(.+)$/m) || [])[1]?.trim() || f;
  const desc = (src.match(/^description:\s*(.+)$/m) || [])[1]?.trim() || '';
  return { slug: f.replace(/\.md$/, ''), title, desc };
});
const existingTitles = existingPosts.map((p) => p.title);

// --- トピック決定（引数 or queueの先頭undone） ---
let topic = process.argv[2];
let queue = null;
if (!topic) {
  queue = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
  const next = queue.topics.find((t) => !t.done);
  if (!next) { console.error('queueに未生成トピックが無い。content/blog-queue.json に追加を。'); process.exit(1); }
  topic = `${next.keyword}｜${next.angle}`;
  next._picked = true;
}

// --- プロンプト ---
const SYSTEM = `あなたは草野球リーグ運営SaaS「Leaguru」の公式ブログを書く編集者兼ライターです。
読者=草野球リーグの運営者・幹事。トーンは「運営の現場の実感」ベースで、売り込み臭を消す。
必ず次の構造・書式（Markdown）に厳密に従うこと（既存記事と統一するため）:

1. 冒頭に結論ブロック（引用記法）:
   > **この記事の結論**
   > - （要点1）
   > - （要点2）
   > - （要点3）
2. 導入の段落（2〜3段落）。
3. 本文は ## の見出しで3〜6セクション。各セクションは具体・箇条書きも活用。一般論でなく現場の実感。
4. ## まとめ （箇条書きの要点 + 最後に Leaguru を"押し付けずに"自然に一度だけ紹介。年額¥18,000で始められる旨を1文。）
5. ## よくある質問 に ### Q. 形式で3問。各回答は検索エンジン/LLMが引用しやすい自然文で。1問はLeaguruに軽く触れてよい。

守ること:
- 事実は保守的に（存在しない制度・数字を断定しない）。競合や他サービスを貶さない。
- キーワードを不自然に詰め込まない。読者の役に立つことを最優先。
- 本文は日本語。2000〜3500字程度。
- 出力は必ず下記JSONのみ（前後に説明文やコードフェンスを付けない）:
{"slug":"英小文字ハイフンのみ(既存と重複しない・内容を表す)","title":"28〜40字","description":"70〜140字(検索スニペット用・記事の要約)","tags":["2〜4個"],"body":"上記構造のMarkdown本文(frontmatterは含めない・# タイトルも含めない・結論ブロックから始める)"}`;

const USER = `今回書くテーマ: 「${topic}」

【既存記事（タイトル ｜ 概要 ｜ slug）】——内容・狙うキーワードを被らせないための一覧:
${existingPosts.map((p) => `- ${p.title} ｜ ${p.desc.slice(0, 60)} ｜ /blog/${p.slug}`).join('\n')}

重要（カニバリ＝検索の共食い防止）:
- この記事は「${topic}」の"独自の切り口"に集中し、主キーワードを既存記事と競合させないこと。
- 上記の既存記事で既に詳しく扱っているトピック（例：成績の計算方法、規定打席の決め方、エクセル管理の限界、日程の組み方 等）は、この記事では詳述しない。必要なら1文で触れて [/blog/該当slug] 形式のMarkdownリンクで誘導する（本文中に自然に内部リンクを1〜3個入れる）。
- slugは既存と重複させない。

このテーマで、上記の構造・書式に厳密に沿った記事を1本、JSONで出力してください。`;

// --- Claude API 呼び出し ---
async function callClaude() {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{ role: 'user', content: USER }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
  const jsonStr = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  return JSON.parse(jsonStr);
}

// --- 安全ゲート（検品）。落ちたら理由を返す ---
function gate(a) {
  const errs = [];
  if (!a.slug || !/^[a-z0-9-]+$/.test(a.slug)) errs.push('slugが不正(英小文字ハイフンのみ)');
  if (existingSlugs.has(a.slug)) errs.push(`slug重複: ${a.slug}`);
  if (!a.title || a.title.length < 15 || a.title.length > 50) errs.push(`title長さ異常(${a.title?.length})`);
  if (existingTitles.includes((a.title || '').trim())) errs.push('title重複');
  if (!a.description || a.description.length < 50 || a.description.length > 160) errs.push(`description長さ異常(${a.description?.length})`);
  if (!Array.isArray(a.tags) || a.tags.length < 1 || a.tags.length > 4) errs.push('tags数異常');
  const body = a.body || '';
  if (body.length < 1500) errs.push(`本文が短い(${body.length}字)`);
  if (!body.includes('この記事の結論')) errs.push('結論ブロック無し');
  if (!body.includes('## よくある質問')) errs.push('よくある質問セクション無し');
  if (!body.includes('Leaguru')) errs.push('Leaguru言及無し');
  if (/TODO|（?ここに|\[.*入力.*\]|Lorem/i.test(body)) errs.push('プレースホルダ残存');
  return errs;
}

// --- メイン ---
(async () => {
  console.log(`生成: ${topic} (model=${MODEL})`);
  const a = await callClaude();
  const errs = gate(a);
  if (errs.length) {
    console.error('🛑 安全ゲート不合格→公開しない:\n  - ' + errs.join('\n  - '));
    process.exit(1);
  }
  const today = new Date().toISOString().slice(0, 10);
  const tags = `[${a.tags.join(', ')}]`;
  const md = `---\ntitle: ${a.title}\ndescription: ${a.description}\ndate: ${today}\ntags: ${tags}\n---\n\n${a.body.trim()}\n`;
  const out = path.join(BLOG_DIR, `${a.slug}.md`);
  fs.writeFileSync(out, md);
  console.log(`✅ 生成完了: content/blog/${a.slug}.md（${a.body.length}字）`);
  console.log(`   title: ${a.title}`);

  // queueのトピックをdoneにする
  if (queue) {
    const t = queue.topics.find((x) => x._picked);
    if (t) { delete t._picked; t.done = true; t.slug = a.slug; t.publishedAt = today; }
    fs.writeFileSync(QUEUE, JSON.stringify(queue, null, 2) + '\n');
  }

  // CI（GitHub Actions）へ結果を渡す: slug と title を step output に出す
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `slug=${a.slug}\ntitle=${a.title}\n`);
  }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
