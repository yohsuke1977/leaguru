import Icon from './Icon'

// ブログ・下層ページ用の共通ヘッダー（リンクは全ページから機能する絶対パス）
export default function SiteHeader() {
  return (
    <header className="nav scrolled" style={{ position: 'static', borderBottom: '1px solid var(--line)' }}>
      <div className="container nav-inner">
        <a className="brand" href="/">
          <div className="brand-mark"><Icon name="ball" size={18} stroke={1.8} /></div>
          <div className="brand-text"><span className="en">Leaguru</span><span className="jp">リーグル</span></div>
        </a>
        <div className="nav-cta">
          <a className="desktop-only" href="/blog" style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy-700)', textDecoration: 'none' }}>ブログ</a>
          <a className="btn btn-ghost desktop-only" href="/contact" style={{ padding: '10px 16px', fontSize: 13.5 }}>お問い合わせ</a>
          <a className="btn btn-primary" href="/#apply" style={{ padding: '10px 16px', fontSize: 13.5 }}>申し込む</a>
        </div>
      </div>
    </header>
  )
}
