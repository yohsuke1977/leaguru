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

## SEOの現状と課題

- React SPA のためクローラーがコンテンツを読み取れない（Issue #23）
- 狙いキーワード: 「野球リーグ 管理」「野球リーグ 公式サイト 作成」等
- 対応予定: vite-plugin-ssg 導入（テナントが増えてから）

---

## 注意事項

- `App.tsx` にLPの全セクションが入っている（ルーターなし）
- Stripe Webhook の署名検証あり（`webhook.ts`）
- Supabase は league-saas と同じインスタンス（ulzqbkighjmnodsukkhh）を使用
