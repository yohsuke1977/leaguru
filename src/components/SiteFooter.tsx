import Icon from './Icon'

// ブログ・下層ページ用の共通フッター（アンカーは /#... の絶対パスで全ページから機能）
export default function SiteFooter() {
  return (
    <footer className="foot">
      <div className="container">
        <div className="foot-grid">
          <div className="foot-brand">
            <div className="brand" style={{ marginBottom: 4 }}>
              <div className="brand-mark"><Icon name="ball" size={18} stroke={1.8} /></div>
              <div className="brand-text"><span className="en">Leaguru</span><span className="jp">リーグル</span></div>
            </div>
            <p>野球リーグの公式サイト作成・運営管理サービス。草野球から少年野球、社会人リーグまで、全国で導入いただいています。</p>
          </div>
          <div className="foot-col"><h4>サービス</h4><ul><li><a href="/#features">機能一覧</a></li><li><a href="/#pricing">料金</a></li><li><a href="/#faq">よくあるご質問</a></li><li><a href="/blog">ブログ</a></li></ul></div>
          <div className="foot-col"><h4>サポート</h4><ul><li><a href="/contact">お問い合わせ</a></li><li><a href="/#apply">お申し込み</a></li></ul></div>
          <div className="foot-col"><h4>会社情報</h4><ul><li><a href="/operator">開発者について</a></li><li><a href="/terms">利用規約</a></li><li><a href="/privacy">プライバシーポリシー</a></li><li><a href="/tokusho">特定商取引法に基づく表記</a></li></ul></div>
        </div>
        <div className="foot-bottom">
          <small>© 2026 Leaguru. All rights reserved.</small>
          <small>Made with care for baseball leagues in Japan ⚾</small>
        </div>
      </div>
    </footer>
  )
}
