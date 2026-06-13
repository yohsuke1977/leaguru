import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import AppRoutes from './AppRoutes.tsx'
import { posts, getPost } from './lib/posts.ts'

export { posts }

// ビルド時プリレンダリング用。指定URLのHTML文字列を返す（ブラウザ不要）。
export function render(url: string): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </StrictMode>,
  )
}

// ルートごとの <title> / description（プリレンダリングでheadに反映）
export function getMeta(url: string): { title: string; description: string } | null {
  if (url === '/blog') {
    return {
      title: 'お役立ちブログ | Leaguru',
      description: 'リーグ運営のヒントや、運営者のリアルな声を発信。草野球リーグをもっと良くするための情報をお届けします。',
    }
  }
  if (url.startsWith('/blog/')) {
    const post = getPost(url.slice('/blog/'.length))
    if (post) return { title: `${post.title} | Leaguru`, description: post.description }
  }
  return null
}
