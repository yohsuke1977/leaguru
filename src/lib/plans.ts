// 料金プランの唯一の定義元。
// LPの料金表・申込フォーム・api/checkout.ts の Stripe Price 選択がこれを共有する。
// ⚠️ ここと Stripe 側の Price がズレると「¥8,800と表示して¥18,000請求する」事故になるため、
//    金額を変えるときは必ず Stripe で Price を作り直し、環境変数を差し替えること。
//
// 帯の根拠（2026-09-15・競合 bb.vcuda.net の導入リーグ45件を実測）:
//   チーム数の中央値は7。71%が8チーム以下、18チーム以上は13%。
//   競合の通常プランは チーム数×¥950 なので、18チームで¥17,100＝¥18,000とほぼ同額になる。
//   13・15・17チームのリーグは実在しなかったため、境目は17でも18でも対象が変わらない。

export type PlanKey = 'small' | 'mid' | 'large'

export type Plan = {
  key: PlanKey
  /** このプランに収まる最大チーム数。large は上限なし */
  maxTeams: number | null
  /** 申込フォームのボタン上段／料金表の見出し */
  teamsLabel: string
  /** 税込・年額 */
  price: number
  priceLabel: string
  /** Stripe Price ID を持つ環境変数名 */
  envKey: string
}

export const PLANS: Plan[] = [
  { key: 'small', maxTeams: 8,    teamsLabel: '〜8チーム',   price: 8800,  priceLabel: '¥8,800',  envKey: 'STRIPE_PRICE_ID_SMALL' },
  { key: 'mid',   maxTeams: 17,   teamsLabel: '9〜17チーム', price: 13800, priceLabel: '¥13,800', envKey: 'STRIPE_PRICE_ID_MID' },
  // large は従来からの価格。既存の Stripe Price（STRIPE_PRICE_ID）をそのまま使う
  { key: 'large', maxTeams: null, teamsLabel: '18チーム〜',  price: 18000, priceLabel: '¥18,000', envKey: 'STRIPE_PRICE_ID' },
]

export const PLAN_BY_KEY = Object.fromEntries(PLANS.map(p => [p.key, p])) as Record<PlanKey, Plan>

export function isPlanKey(v: unknown): v is PlanKey {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(PLAN_BY_KEY, v)
}

/**
 * チーム数からプランを決める。更新時に帯を見直すときに使う。
 * ⚠️ 数えるのは「アクティブなシーズンに参加しているチーム数」であって、
 *    teams テーブルの行数ではない（過去に参加した解散チームも残っているため）。
 */
export function planForTeamCount(teams: number): Plan {
  return PLANS.find(p => p.maxTeams === null || teams <= p.maxTeams)!
}

/** 「¥8,800から」のような最小価格表示に使う */
export const MIN_PRICE_LABEL = PLANS[0].priceLabel
