import { Link } from 'react-router-dom'
import { posts } from '../lib/posts'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

export default function BlogListPage() {
  return (
    <>
      <SiteHeader />
      <div className="blog-wrap">
        <header className="blog-head">
          <h1 className="blog-title">お役立ちブログ</h1>
          <p className="blog-lead">リーグ運営のヒントや、運営者のリアルな声をお届けします。</p>
        </header>
        <ul className="blog-list">
          {posts.map((p) => (
            <li key={p.slug} className="blog-card">
              <Link to={`/blog/${p.slug}`}>
                <time className="blog-date">{p.date}</time>
                <h2 className="blog-card-title">{p.title}</h2>
                <p className="blog-card-desc">{p.description}</p>
                {p.tags.length > 0 && (
                  <div className="blog-tags">
                    {p.tags.map((t) => (
                      <span key={t} className="blog-tag">#{t}</span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <SiteFooter />
    </>
  )
}
