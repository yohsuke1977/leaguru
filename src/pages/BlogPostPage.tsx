import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPost } from '../lib/posts'

export default function BlogPostPage() {
  const { slug } = useParams()
  const post = slug ? getPost(slug) : undefined

  useEffect(() => {
    if (post) document.title = `${post.title} | Leaguru`
  }, [post])

  if (!post) {
    return (
      <div className="blog-wrap">
        <p className="blog-lead">記事が見つかりませんでした。</p>
        <Link to="/blog" className="blog-back">← ブログ一覧へ</Link>
      </div>
    )
  }

  return (
    <article className="blog-wrap">
      <header className="blog-head">
        <Link to="/blog" className="blog-back">← ブログ一覧</Link>
        <time className="blog-date">{post.date}</time>
        <h1 className="blog-title">{post.title}</h1>
        {post.tags.length > 0 && (
          <div className="blog-tags">
            {post.tags.map((t) => (
              <span key={t} className="blog-tag">#{t}</span>
            ))}
          </div>
        )}
      </header>
      <div className="blog-body" dangerouslySetInnerHTML={{ __html: post.html }} />
      <footer className="blog-cta">
        <h3>Leaguru なら、これ全部がすぐに始められます</h3>
        <p>順位表・成績・日程・お知らせをまとめて管理。年額¥18,000・30日間の無料トライアル。</p>
        <Link to="/" className="blog-cta-btn">サービス詳細を見る</Link>
      </footer>
    </article>
  )
}
