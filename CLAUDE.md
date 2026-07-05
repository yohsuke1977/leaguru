# leaguru プロジェクト

Leaguru のLP（集客・申込）サイト。league-saas（サービス本体）とは別リポジトリ。
成り行きで分離したが、役割上も「集客・申込」と「サービス本体」で明確に分かれている。

- **GitHub**: yohsuke1977/leaguru
- **本番URL**: https://leaguru.jp
- **Vercelプロジェクト**: leaguru

---

## 技術スタック

- **フロント**: React + TypeScript + Vite（SPA・ルーターなし）
- **ホスティング**: Vercel
- **決済**: Stripe Checkout
- **メール**: Resend
- **DB**: Supabase（league-saasと同じインスタンス・申込時のプロビジョニング用）

---

## ディレクトリ構成

```
src/
  App.tsx          # LP本体（全セクションがここに集約）
  leaguru.css      # LP専用スタイル
  pages/           # 個別ページ
    ContactPage.tsx
    PrivacyPage.tsx
    TermsPage.tsx
    TokushoPage.tsx  # 特商法表記
    OperatorPage.tsx
    SuccessPage.tsx  # 申込完了ページ
api/               # Vercel Serverless Functions
  checkout.ts      # Stripe Checkout セッション発行
  webhook.ts       # Stripe Webhook（決済完了→プロビジョニング）
  check-slug.ts    # スラッグ重複チェック
  contact.ts       # お問い合わせ
  cleanup.ts       # 期限切れデータのクリーンアップ
```

---

## 申込フロー

1. LP の申込フォーム（`#apply`）でリーグ名・担当者・メール・スラッグ等を入力
2. `/api/checkout` → Stripe Checkout セッション発行（30日トライアル付き）
3. Stripe 決済完了 → `/api/webhook` → Supabase にリーグ作成・ウェルカムメール送信
4. `/success` ページへリダイレクト

---

## 価格プラン

- **年額 ¥18,000（税込）/ リーグ**
- 30日間無料トライアル（クレジットカード登録必須）
- Stripe Price ID: 環境変数 `STRIPE_PRICE_ID`

---

## SEOの現状

- **プリレンダリング対応済み**（Issue #23 解決）。`build` で `vite build --ssr src/entry-server.tsx` → `scripts/prerender.mjs` が各ページ・全ブログ記事を静的HTML化（title/description/本文がHTMLに埋まる＝クローラー可読）。
- **ブログ記事8本**を `content/blog/*.md` で管理（`src/lib/posts.ts` がビルド時に読込）。狙い: 「草野球 リーグ 運営 日程」「成績 集計」「参加費 管理」等の運営者向けロングテール。
- `dist/sitemap.xml` に全記事を出力 → `npm run notify-index` で Google Indexing API に送信。
- 狙いキーワード: 「野球リーグ 管理」「野球リーグ 公式サイト 作成」等
- 残課題は**オンページSEOではなく集客・被リンク（オフページ／SNS配信）**。記事は書けているが外部への配信・PRが手薄（生息地への告知・記事の各SNS展開が次の一手）。

---

## 注意事項

- `App.tsx` にLPの全セクションが入っている（ルーターなし）
- Stripe Webhook の署名検証あり（`webhook.ts`）
- Supabase は league-saas と同じインスタンス（ulzqbkighjmnodsukkhh）を使用
