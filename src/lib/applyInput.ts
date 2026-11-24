// 申込フォームの入力の扱い（leaguru#11）。
// フォーム（src/App.tsx）・決済前の確認（api/checkout.ts）・メール（api/webhook.ts）で同じものを使う

// 申込の入力の文字数の上限。Stripe の metadata は1項目500文字までなので、それより十分小さくする
export const APPLY_MAX = { leagueName: 60, contact: 60, email: 254, phone: 20 } as const

const LABEL: Record<keyof typeof APPLY_MAX, string> = {
  leagueName: 'リーグ名', contact: '担当者名', email: 'メールアドレス', phone: '電話番号',
}

// 文字数が上限を超えていればお客さん向けの文言を、問題なければ null を返す。文字列でない値も弾く
export function applyInputProblem(input: Record<string, unknown>): string | null {
  for (const key of Object.keys(APPLY_MAX) as (keyof typeof APPLY_MAX)[]) {
    const v = input[key]
    if (v === undefined || v === null || v === '') continue
    if (typeof v !== 'string') return `${LABEL[key]}の形式が正しくありません`
    if ([...v].length > APPLY_MAX[key]) return `${LABEL[key]}は${APPLY_MAX[key]}文字以内で入力してください`
  }
  return null
}

// HTML メールに入れる値は必ずこれを通す。申込の入力は本人確認なしで他人のアドレスに届くので、
// 通さないとリーグ名に入れたリンクやタグがそのまま Leaguru のメールとして届いてしまう
export function escapeHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
