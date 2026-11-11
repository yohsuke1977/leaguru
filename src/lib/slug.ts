/**
 * リーグのURL（{slug}.leaguru.jp）の判定。api/check-slug.ts（入力中の確認）と
 * api/checkout.ts（申込の受け口）で同じものを使う（leaguru#6）。
 *
 * 以前はブラウザ側だけで確かめていたため、フォームを通さず直接送ると
 * 予約語・大文字入りの slug のままリーグが作られ得た。
 * 重複は DB の unique（leagues_slug_key）でも止まるが、そこで止まると
 * webhook のリーグ作成が失敗するだけでお客さんには伝わらないので、入口で弾く。
 */

export const RESERVED_SLUGS = ['www', 'api', 'app', 'demo', 'admin', 'mail', 'smtp', 'sbl', 'support', 'help', 'status', 'blog', 'leaguru']

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/

export function normalizeSlug(raw: unknown): string {
  return typeof raw === 'string' ? raw.toLowerCase().trim() : ''
}

export type SlugProblem = 'empty' | 'invalid' | 'reserved'

/** 形と予約語だけを見る（重複は呼び出し側で DB に問い合わせる） */
export function slugFormatProblem(slug: string): SlugProblem | null {
  if (!slug) return 'empty'
  if (!SLUG_RE.test(slug)) return 'invalid'
  if (RESERVED_SLUGS.includes(slug)) return 'reserved'
  return null
}
