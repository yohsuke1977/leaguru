import Icon from '../components/Icon'
import '../leaguru.css'

interface Props {
  title: string
  children: React.ReactNode
}

export default function LegalLayout({ title, children }: Props) {
  return (
    <>
      <header className="nav scrolled" style={{ position: 'static', borderBottom: '1px solid var(--line)' }}>
        <div className="container nav-inner">
          <a className="brand" href="/">
            <div className="brand-mark"><Icon name="ball" size={18} stroke={1.8} /></div>
            <div className="brand-text"><span className="en">Leaguru</span><span className="jp">リーグル</span></div>
          </a>
          <div className="nav-cta">
            <a className="btn btn-ghost desktop-only" href="/contact" style={{ padding: '10px 16px', fontSize: 13.5 }}>お問い合わせ</a>
            <a className="btn btn-primary desktop-only" href="/#apply" style={{ padding: '10px 16px', fontSize: 13.5 }}>申し込む</a>
          </div>
        </div>
      </header>

      <main style={{ background: '#fff', minHeight: '80vh' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 96px' }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', textDecoration: 'none', marginBottom: 32 }}>
            <Icon name="arrow-right" size={13} style={{ transform: 'rotate(180deg)' }} />
            トップへ戻る
          </a>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy-900)', marginBottom: 8 }}>{title}</h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 48 }}>Leaguru（リーグル）</div>
          <div className="legal-body">{children}</div>
        </div>
      </main>

      <footer className="foot" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="container">
          <div className="foot-bottom">
            <small>© 2026 Leaguru. All rights reserved.</small>
            <small style={{ display: 'flex', gap: 16 }}>
              <a href="/terms">利用規約</a>
              <a href="/privacy">プライバシーポリシー</a>
              <a href="/tokusho">特定商取引法</a>
            </small>
          </div>
        </div>
      </footer>
    </>
  )
}
