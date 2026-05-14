import { useState, useEffect } from 'react'
import Icon from './components/Icon'
import './leaguru.css'

const ACCENT = { accent: '#ef7f2c', accentSoft: '#fde7d4', accentDeep: '#c9601a', accentInk: '#ffffff' }

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const inView = (el: Element) => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0 }
    const revealNow = (el: Element) => el.classList.add('in')
    requestAnimationFrame(() => { els.forEach(el => { if (inView(el)) revealNow(el) }) })
    const safety = setTimeout(() => { els.forEach(revealNow) }, 800)
    let io: IntersectionObserver | undefined
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { revealNow(e.target); io!.unobserve(e.target) } })
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' })
      els.forEach(el => io!.observe(el))
    }
    return () => { clearTimeout(safety); io?.disconnect() }
  }, [])
}

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => { document.body.style.overflow = menuOpen ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [menuOpen])
  const close = () => setMenuOpen(false)
  return (
    <header className={'nav' + (scrolled ? ' scrolled' : '')}>
      <div className="container nav-inner">
        <a className="brand" href="#top" onClick={close}>
          <div className="brand-mark"><Icon name="ball" size={18} stroke={1.8} /></div>
          <div className="brand-text"><span className="en">Leaguru</span><span className="jp">リーグル</span></div>
        </a>
        <nav className="nav-links">
          <a href="#features">機能</a>
          <a href="#usecases">利用シーン</a>
          <a href="#how">使い方</a>
          <a href="#pricing">料金</a>
          <a href="#faq">よくある質問</a>
        </nav>
        <div className="nav-cta">
          <a className="btn btn-ghost desktop-only" href="/contact" style={{ padding: '10px 16px', fontSize: 13.5 }}>お問い合わせ</a>
          <a className="btn btn-primary desktop-only" href="#apply" style={{ padding: '10px 16px', fontSize: 13.5 }}>申し込む</a>
          <button className={'nav-burger' + (menuOpen ? ' open' : '')} aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'} aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>
            <span /><span /><span />
          </button>
        </div>
      </div>
      <div className={'mobile-menu' + (menuOpen ? ' open' : '')} aria-hidden={!menuOpen}>
        <div className="mobile-menu-inner">
          <nav className="mobile-nav">
            <a href="#features" onClick={close}>機能</a>
            <a href="#admin" onClick={close}>管理画面</a>
            <a href="#usecases" onClick={close}>利用シーン</a>
            <a href="#how" onClick={close}>使い方</a>
            <a href="#pricing" onClick={close}>料金</a>
            <a href="#news" onClick={close}>ニュース</a>
            <a href="#faq" onClick={close}>よくあるご質問</a>
            <a href="/contact" onClick={close}>お問い合わせ</a>
          </nav>
          <div className="mobile-cta">
            <a className="btn btn-primary btn-lg" href="#apply" onClick={close}>いますぐ申し込む <Icon name="arrow-right" size={16} /></a>
            <a className="btn btn-ghost btn-lg" href="/contact" onClick={close}>お問い合わせ</a>
          </div>
          <div className="mobile-foot"><small>年額 ¥15,000(税込) · 追加料金なし</small></div>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="hero" id="top" data-layout="split">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-copy reveal">
            <span className="eyebrow">For Baseball Leagues</span>
            <h1 className="hero-title">リーグ運営を、<br />もっと<em>かんたん</em>に。</h1>
            <p className="hero-sub">順位表・成績・日程・お知らせ。<br />リーグの公式サイトが、今日から持てる。</p>
            <div className="hero-actions">
              <a className="btn btn-primary btn-lg" href="#apply">いますぐ申し込む <Icon name="arrow-right" size={18} /></a>
              <a className="btn btn-ghost btn-lg" href="#how"><Icon name="play" size={14} /> デモを見る(準備中)</a>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><div className="num">¥15,000<small>/年</small></div><div className="lbl">明朗な年額料金</div></div>
              <div className="hero-stat"><div className="num">5<small>分</small></div><div className="lbl">開設までの時間</div></div>
              <div className="hero-stat"><div className="num">0<small>円</small></div><div className="lbl">初期・追加費用</div></div>
            </div>
          </div>
          <div className="hero-visual reveal">
            <div className="dash-wrap">
              <img
                src="/screenshots/front_boxed.png"
                alt="リーグ公式サイト プレビュー"
                style={{ width: '100%', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,.22)', border: '1px solid rgba(0,0,0,.08)' }}
              />
              <div className="float-card notif">
                <div className="ic"><Icon name="bell" size={16} /></div>
                <div><div className="ttl">試合結果を更新</div><div className="sub">府中ブルーウェーブ 3 - 1 多摩川タイガース</div></div>
              </div>
              <div className="float-card score">
                <div className="ic b"><Icon name="trophy" size={16} /></div>
                <div><div className="ttl">首位 セントラル・スターズ</div><div className="sub">4勝0敗 · 勝点12</div></div>
                <div className="score-num">1位</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Features() {
  const items = [
    { ic: 'trophy',    title: '順位表',           desc: '勝敗を入力するだけで自動集計。常に最新の順位表が公開されます。',             tag: '01' },
    { ic: 'calendar',  title: '日程管理',         desc: '試合日程はフォームから数クリックで登録・変更。変更内容はすぐ公式サイトへ反映されます。', tag: '02' },
    { ic: 'chart',     title: '成績管理',         desc: '打撃・投手成績は入力するだけ。個人ランキングも自動で表示。',                 tag: '03' },
    { ic: 'megaphone', title: 'お知らせ',         desc: 'ルール変更・雨天中止など、リーグからの連絡をウェブで一斉に発信できます。',   tag: '04' },
    { ic: 'mobile',    title: 'スマホ対応',       desc: '選手・ご家族はスマホで順位や日程をいつでも確認できます。',                   tag: '05' },
    { ic: 'settings',  title: '管理画面',         desc: '専門知識は不要。普段使いのブラウザだけで運営いただけます。',                 tag: '06' },
    { ic: 'spark',     title: 'トーナメント対応', desc: '春季・秋季大会などのグループ予選＋決勝トーナメント表の管理もLeaguruひとつで完結。', tag: '07' },
  ]
  return (
    <section className="features" id="features">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Features</span>
          <h2 className="section-title">運営に必要なものを、ひとつに。</h2>
          <p className="section-lead">順位表から日程・成績・お知らせまで、リーグ運営に必要な機能を標準装備。別々のサービスを使い分ける必要はありません。</p>
        </div>
        <div className="feature-grid">
          {items.map((it, i) => (
            <div className="feature reveal" key={i} style={{ transitionDelay: `${i * 60}ms` }}>
              <span className="tag">{it.tag}</span>
              <div className="ic"><Icon name={it.ic} size={26} /></div>
              <h3>{it.title}</h3>
              <p>{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TournamentShowcase() {
  const [tab, setTab] = useState<'bracket' | 'group'>('bracket')
  const points = [
    { ic: 'trophy', title: 'グループ予選＋決勝トーナメント表', desc: '予選のグループ戦から決勝の対戦表まで、ひとつの画面で管理。結果を入力するたびにリアルタイム更新されます。' },
    { ic: 'spark',  title: 'ウェブ抽選でその場で組み合わせ確定', desc: 'ボタンひとつでグループ分けを自動抽選。Excelやくじ引きは不要です。' },
    { ic: 'mobile', title: '参加チームがスマホで確認できる',     desc: '公式サイトURLをLINEで共有するだけ。選手・スタッフが試合状況を即座に確認できます。' },
  ]
  return (
    <section className="tournament-showcase" id="tournament">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow" style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>
            <span style={{ background: 'rgba(255,255,255,0.6)' }} />Tournament
          </span>
          <h2 className="section-title" style={{ color: '#fff' }}>トーナメント大会にも、対応しています。</h2>
          <p className="section-lead" style={{ color: 'rgba(255,255,255,0.65)' }}>
            春季・秋季大会などのトーナメント運営もLeaguruひとつで完結。<br />
            グループ予選から決勝トーナメント表まで、自動で集計・公開します。
          </p>
        </div>

        <div className="ts-tabs reveal">
          <button className={'ts-tab' + (tab === 'bracket' ? ' active' : '')} onClick={() => setTab('bracket')}>決勝トーナメント表</button>
          <button className={'ts-tab' + (tab === 'group'   ? ' active' : '')} onClick={() => setTab('group')}>グループステージ</button>
        </div>

        <div className="ts-screen reveal">
          <div className="ts-browser-bar">
            <span className="ts-dot" /><span className="ts-dot" /><span className="ts-dot" />
            <span className="ts-url">demo.leaguru.jp / 2026年春季大会</span>
          </div>
          <img
            src={tab === 'bracket' ? '/screenshots/tournament_bracket.png' : '/screenshots/tournament_group.png'}
            alt={tab === 'bracket' ? '決勝トーナメント画面' : 'グループステージ画面'}
            className="ts-img"
          />
        </div>

        <div className="ts-points">
          {points.map((p, i) => (
            <div className="ts-point reveal" key={i} style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="ts-point-ic"><Icon name={p.ic} size={22} /></div>
              <div><h4>{p.title}</h4><p>{p.desc}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AdminShowcase() {
  const callouts = [
    { ic: 'ball',      title: 'スコアを入力するだけ', desc: '打数・安打・打点を入力すれば、個人成績ランキングも順位表も自動で更新されます。' },
    { ic: 'calendar',  title: '日程は簡単入力',       desc: '試合日程はフォームから数クリックで登録・変更。変更はすぐに公式サイトへ反映されます。' },
    { ic: 'megaphone', title: 'お知らせを一斉発信',   desc: 'ルール変更や雨天中止など、リーグからの連絡を選手・ご家族にウェブで一斉発信できます。' },
  ]
  return (
    <section className="admin-showcase" id="admin">
      <div className="container">
        <div className="section-head admin-showcase-head">
          <span className="eyebrow">Admin Preview</span>
          <h2 className="section-title">かんたんな管理画面で、すべて完結。</h2>
          <p className="section-lead">試合結果の入力からお知らせの発信まで、専門知識のいらない画面で運営できます。日々の運営にかかる時間を、できる限り短くする設計です。</p>
        </div>
        <div className="admin-showcase-mock">
          <img
            src="/screenshots/admin_game_input.png"
            alt="試合結果入力画面"
            style={{ width: '100%', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,.22)', border: '1px solid rgba(0,0,0,.1)' }}
          />
        </div>
        <div className="admin-callouts">
          {callouts.map((c, i) => (
            <div className="admin-callout" key={i}>
              <div className="ic"><Icon name={c.ic} size={20} /></div>
              <div><h4>{c.title}</h4><p>{c.desc}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function LayoutShowcase() {
  const [active, setActive] = useState(0)
  const layouts = [
    { id: 'boxed',    label: 'ボックス型',   img: '/screenshots/front_boxed.png',    desc: '浮き上がるカードデザイン。モダンで見やすい構成。（Forest カラー）' },
    { id: 'standard', label: 'スタンダード', img: '/screenshots/front_standard.png', desc: 'シンプルで落ち着いた横広レイアウト。（Navy カラー）' },
    { id: 'fullwide', label: 'フルワイド',   img: '/screenshots/front_fullwide.png', desc: '斜めの大胆なヒーローとスクロールティッカー。（Crimson カラー）' },
    { id: 'sidebar',  label: 'サイドバー',   img: '/screenshots/front_sidebar.png',  desc: '左固定ナビで、選手がページを素早く移動できる。（Slate カラー）' },
  ]
  return (
    <section className="layout-showcase" id="layouts" style={{ background: 'var(--navy-900, #0a0f1e)', padding: '88px 0' }}>
      <div className="container">
        <div className="section-head reveal" style={{ marginBottom: 48 }}>
          <span className="eyebrow" style={{ color: 'var(--accent)' }}>4 Layouts</span>
          <h2 className="section-title" style={{ color: '#fff' }}>デザインは4パターンから選択。</h2>
          <p className="section-lead" style={{ color: 'rgba(255,255,255,.55)' }}>管理画面からワンクリックで切り替え。配色もフォントも自由に変えられます。</p>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
          {layouts.map((l, i) => (
            <button
              key={l.id}
              onClick={() => setActive(i)}
              style={{
                padding: '8px 20px', borderRadius: 9999, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: active === i ? 'var(--accent)' : 'rgba(255,255,255,.1)',
                color: active === i ? '#fff' : 'rgba(255,255,255,.6)',
                transition: 'all .2s',
              }}
            >{l.label}</button>
          ))}
        </div>
        <div className="reveal" style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>
          <img
            key={layouts[active].img}
            src={layouts[active].img}
            alt={layouts[active].label}
            style={{
              width: '100%', borderRadius: 14,
              boxShadow: '0 32px 80px rgba(0,0,0,.5)',
              border: '1px solid rgba(255,255,255,.08)',
              display: 'block',
            }}
          />
          <div style={{
            position: 'absolute', bottom: 20, left: 20,
            background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)',
            borderRadius: 10, padding: '10px 16px', color: '#fff',
          }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{layouts[active].label}</div>
            <div style={{ fontSize: 12, opacity: .7, marginTop: 2 }}>{layouts[active].desc}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ColorPresetShowcase() {
  const presets = [
    { img: '/screenshots/front_boxed.png',    label: 'Forest',  colors: ['#0c3020', '#1a6b3a', '#b8921a'] },
    { img: '/screenshots/front_standard.png', label: 'Navy',    colors: ['#0d1f3c', '#1a3d6b', '#c8102e'] },
    { img: '/screenshots/front_fullwide.png', label: 'Crimson', colors: ['#6b0000', '#a00000', '#f0e0c0'] },
    { img: '/screenshots/front_sidebar.png',  label: 'Slate',   colors: ['#1e2a38', '#2c4a62', '#3aad6e'] },
  ]
  return (
    <section style={{ background: '#f4f6fa', padding: '88px 0' }}>
      <div className="container">
        <div className="section-head reveal" style={{ marginBottom: 52 }}>
          <span className="eyebrow">Color & Style</span>
          <h2 className="section-title">チームカラーで、リーグの個性を出す。</h2>
          <p className="section-lead">6色プリセット収録 + カスタムカラー対応。フォントも3種類から選べます。<br />すべて管理画面からワンクリックで即時反映。</p>
        </div>

        {/* 4配色の比較サムネイル */}
        <div className="reveal" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
          marginBottom: 56,
        }}>
          {presets.map(p => (
            <div key={p.label}>
              <img
                src={p.img}
                alt={p.label}
                style={{
                  width: '100%', borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,.10)',
                  border: '1px solid rgba(0,0,0,.06)',
                  display: 'block',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                {p.colors.map(c => (
                  <span key={c} style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: c, flexShrink: 0,
                    border: '1px solid rgba(0,0,0,.12)',
                  }} />
                ))}
                <span style={{ fontSize: 13, fontWeight: 600, color: '#444', marginLeft: 2 }}>{p.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 管理画面のカラー設定スクショ */}
        <div className="reveal" style={{ maxWidth: 880, margin: '0 auto', position: 'relative' }}>
          <img
            src="/screenshots/admin_colors.png"
            alt="管理画面のカラー・レイアウト設定"
            style={{
              width: '100%', borderRadius: 14,
              boxShadow: '0 16px 48px rgba(0,0,0,.12)',
              border: '1px solid rgba(0,0,0,.07)',
              display: 'block',
            }}
          />
          <div style={{
            position: 'absolute', bottom: 20, right: 20,
            background: 'rgba(10,15,30,.82)', backdropFilter: 'blur(8px)',
            borderRadius: 10, padding: '10px 18px', color: '#fff',
          }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>管理画面から設定→即公開</div>
            <div style={{ fontSize: 11, opacity: .65, marginTop: 2 }}>レイアウト・カラー・フォントをまとめて管理</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function UseCases() {
  const cases = [
    { ic: 'team',   title: '草野球リーグ',         desc: '順位表・成績・日程を一か所にまとめて、LINEグループへの転記作業から解放されます。' },
    { ic: 'kids',   title: '少年野球リーグ',       desc: '保護者への試合日程の周知や、子どもの個人成績の公開が簡単に行えます。' },
    { ic: 'office', title: '社会人・企業内リーグ', desc: '参加者全員がスマホからリアルタイムで順位と結果を確認。Slackなどへの共有もURLひとつです。' },
    { ic: 'heart',  title: 'OB・サークルリーグ',  desc: '数チームの小規模リーグでも使いやすい価格設定。立ち上げから公開まで最短5分です。' },
  ]
  return (
    <section className="usecases" id="usecases">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Use Cases</span>
          <h2 className="section-title">こんなリーグに、ぴったりです。</h2>
          <p className="section-lead">草野球から少年野球、社会人リーグやOB会まで。規模や運営スタイルを問わず使えます。</p>
        </div>
        <div className="uc-grid">
          {cases.map((c, i) => (
            <div className="uc reveal" key={i} style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="uc-illust"><Icon name={c.ic} size={26} /></div>
              <h3>{c.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '01', ic: 'plus',     title: 'リーグを登録',     desc: 'リーグ名やチーム一覧を登録するだけ。フォームに沿って入力すれば最短5分で開設できます。' },
    { n: '02', ic: 'calendar', title: '試合結果を入力',   desc: '試合ごとにスコアと打撃・投手成績を入力します。順位表とランキングは自動で更新されます。' },
    { n: '03', ic: 'spark',    title: '公式サイトで公開', desc: 'あなたのリーグ専用のURLで、選手・ご家族・サポーターへすぐに情報を届けられます。' },
  ]
  return (
    <section className="how" id="how">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">How it works</span>
          <h2 className="section-title">3ステップで、はじめられます。</h2>
          <p className="section-lead">複雑な設定や専門知識は必要ありません。お申し込みから公開まで、運営担当者おひとりで完結できます。</p>
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <div className="step reveal" key={i} style={{ transitionDelay: `${i * 100}ms` }}>
              <div className="ic"><Icon name={s.ic} size={36} stroke={1.4} /></div>
              <div className="step-num">STEP <span>{s.n}</span></div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* Testimonials — ユーザー獲得後に実際の声で復活。コードは memory/project_lp_hidden_sections.md に保存済み */

function Pricing() {
  const features = [
    'リーグ専用の公式サイト', '順位表・成績の自動集計', '試合日程・お知らせ機能',
    '管理画面（チーム数無制限）', 'スマートフォン完全対応', 'メールサポート',
    '独自URL（leaguru.jp/◯◯）', '年1回の機能アップデート',
  ]
  return (
    <section className="pricing" id="pricing">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Pricing</span>
          <h2 className="section-title">わかりやすい、1プラン。</h2>
          <p className="section-lead">シンプルな年額制で、すべての機能をご利用いただけます。追加料金・オプション課金は一切ありません。</p>
        </div>
        <div className="price-card reveal">
          <span className="price-badge">スタンダードプラン</span>
          <h3>Leaguru リーグサイト</h3>
          <div className="price-amount"><span className="yen">¥</span>15,000<span className="per">/ 年</span></div>
          <div className="price-tax">税込・1リーグあたり</div>
          <div className="price-features">
            {features.map((f, i) => (
              <div className="price-feature" key={i}><span className="check"><Icon name="check" size={14} /></span>{f}</div>
            ))}
          </div>
          <a className="btn btn-primary btn-lg" href="#apply" style={{ minWidth: 240 }}>いますぐ申し込む <Icon name="arrow-right" size={18} /></a>
          <div className="form-note" style={{ marginTop: 18, color: 'var(--muted)' }}>
            <Icon name="lock" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            お申し込み後、Stripeの安全な決済ページへご案内します
          </div>
        </div>
      </div>
    </section>
  )
}

function News() {
  const posts = [
    { cat: 'アップデート', date: '2026.05.08', title: '個人ランキングに「打点」「盗塁」の項目を追加しました', excerpt: 'ご要望の多かった2項目を順位表に表示できるようになりました。設定画面から有効化できます。', ic: 'spark' },
    { cat: 'コラム',       date: '2026.04.22', title: '草野球リーグ運営者が語る「続く運営、続かない運営」', excerpt: '10年続く草野球リーグの代表3名にインタビュー。長く運営を続けるためのコツを伺いました。', ic: 'team' },
    { cat: 'お知らせ',     date: '2026.04.01', title: '2026年シーズン開幕キャンペーンを開始しました', excerpt: '5月末までにお申し込みいただいたリーグ様には、初期設定を無料でサポートいたします。', ic: 'bell' },
  ]
  return (
    <section className="news" id="news">
      <div className="container">
        <div className="news-head reveal">
          <div>
            <span className="eyebrow">News &amp; Blog</span>
            <h2>ニュース・コラム</h2>
            <p className="lead">アップデート情報や、リーグ運営に役立つコラムをお届けしています。</p>
          </div>
          <a className="btn btn-ghost" href="#" style={{ padding: '10px 18px', fontSize: 13.5 }}>すべての記事を見る <Icon name="arrow-right" size={14} /></a>
        </div>
        <div className="news-grid">
          {posts.map((p, i) => (
            <article className={'news-card reveal'} key={i} style={{ transitionDelay: `${i * 80}ms` }}>
              <div className={`news-thumb alt-${i + 1}`}>
                <div className="pat" />
                <Icon name={p.ic} size={48} stroke={1.2} style={{ opacity: 0.5 }} />
              </div>
              <div className="body">
                <div className="meta"><span className="cat">{p.cat}</span><span>{p.date}</span></div>
                <h3>{p.title}</h3>
                <p>{p.excerpt}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const items = [
    { q: '専門的な知識は必要ですか？', a: 'いいえ、不要です。普段スマートフォンやパソコンをお使いの方であれば、どなたでもご利用いただけます。管理画面はフォームに沿って入力する形式で、HTMLやプログラミングの知識は一切必要ありません。' },
    { q: 'スマホから管理できますか？', a: 'はい、可能です。管理画面・公開サイトともにスマートフォンに完全対応しています。試合直後にスマホからスコアを入力する、といった使い方をされている運営者の方が多いです。' },
    { q: '途中で解約できますか？', a: 'はい、いつでも解約いただけます。年額制ですが、ご利用期間の残月分について日割りでのご返金には対応しておりませんので、その点のみご了承ください。' },
    { q: '複数のリーグを管理できますか？', a: '複数リーグを管理される場合は、リーグごとにお申し込みいただく形となります。連盟様向けに、複数リーグをまとめて管理できるプランも準備中です。お気軽にご相談ください。' },
  ]
  const [open, setOpen] = useState(0)
  return (
    <section className="faq" id="faq">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">FAQ</span>
          <h2 className="section-title">よくあるご質問</h2>
          <p className="section-lead">お申し込み前によくいただくご質問をまとめました。こちらにないご質問は、お気軽にお問い合わせください。</p>
        </div>
        <div className="faq-list">
          {items.map((it, i) => (
            <div className={'faq-item reveal' + (open === i ? ' open' : '')} key={i} style={{ transitionDelay: `${i * 50}ms` }}>
              <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                <span className="q-mark">Q.</span>
                <span>{it.q}</span>
                <span className="toggle"><Icon name="plus" size={18} /></span>
              </button>
              <div className="faq-a"><div className="faq-a-inner">{it.a}</div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ContactCTA() {
  return (
    <section className="contact-cta" id="contact">
      <div className="container">
        <div className="contact-cta-inner reveal">
          <div>
            <span className="eyebrow">Contact</span>
            <h2>お問い合わせ</h2>
            <p>機能・料金・導入相談など、お気軽にお寄せください。<br />担当者より2営業日以内にご返信いたします。</p>
          </div>
          <a className="btn btn-primary btn-lg" href="/contact">
            お問い合わせフォームへ
            <Icon name="arrow-right" size={18} />
          </a>
        </div>
      </div>
    </section>
  )
}

function ApplicationForm() {
  const [form, setForm] = useState({ leagueName: '', contact: '', email: '', phone: '', size: '' })
  const [submitted, setSubmitted] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const submit = (e: React.FormEvent) => { e.preventDefault(); setSubmitted(true) }
  return (
    <section className="form-section" id="apply">
      <div className="container">
        <div className="form-grid">
          <div className="form-info">
            <span className="eyebrow" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
              <span style={{ background: '#fff' }} />Application
            </span>
            <h2 className="section-title" style={{ marginTop: 14 }}>お申し込み</h2>
            <p className="section-lead">フォーム送信後、そのまま決済画面へお進みください。決済完了と同時に、あなたのリーグサイトがご利用いただけます。</p>
            <div className="flow-steps">
              <div className="flow-step cur"><span className="n">1</span>お申し込み</div>
              <span className="flow-arrow">→</span>
              <div className="flow-step"><span className="n">2</span>決済(Stripe)</div>
              <span className="flow-arrow">→</span>
              <div className="flow-step"><span className="n">3</span>即日ご利用開始</div>
            </div>
            <ul>
              <li><span className="ic"><Icon name="check" size={12} /></span>決済完了と同時に管理画面が開設されます</li>
              <li><span className="ic"><Icon name="check" size={12} /></span>年額 ¥15,000(税込)・追加料金一切なし</li>
              <li><span className="ic"><Icon name="check" size={12} /></span>初期設定・データ移行は無料サポート</li>
              <li><span className="ic"><Icon name="check" size={12} /></span>クレジットカード/ Apple Pay / Google Pay 対応</li>
            </ul>
          </div>
          <div className="form-card">
            {submitted ? (
              <div className="form-success">
                <Icon name="check" size={32} />
                <div style={{ fontSize: 18, marginTop: 6 }}>お申し込みを受け付けました</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)', lineHeight: 1.8 }}>続けて決済画面へお進みください。<br />決済完了後、すぐに管理画面をご利用いただけます。</div>
                <a className="btn btn-primary btn-lg" href="#" style={{ marginTop: 16 }}>Stripe決済へ進む(¥15,000 / 年) <Icon name="arrow-right" size={16} /></a>
                <small style={{ color: 'var(--muted)', marginTop: 8, fontWeight: 500 }}>
                  <Icon name="lock" size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />Stripeの安全な決済ページに遷移します
                </small>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
                  <h3 style={{ margin: 0, fontSize: 18, color: 'var(--navy-900)' }}>申込フォーム</h3>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>年額 ¥15,000(税込)</span>
                </div>
                <div className="form-row"><label>リーグ名 <span className="req">必須</span></label><input type="text" required value={form.leagueName} onChange={e => set('leagueName', e.target.value)} placeholder="例:多摩川草野球リーグ" /></div>
                <div className="form-row"><label>担当者名 <span className="req">必須</span></label><input type="text" required value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="例:山田 太郎" /></div>
                <div className="form-row"><label>メールアドレス <span className="req">必須</span></label><input type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="example@league.jp" /></div>
                <div className="form-row"><label>電話番号 <span className="opt">任意</span></label><input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="090-0000-0000" /></div>
                <div className="form-row">
                  <label>リーグ規模(チーム数) <span className="req">必須</span></label>
                  <div className="form-segments">
                    {[{ v: 'small', top: '〜', val: '8チーム' }, { v: 'mid', top: '9〜', val: '16チーム' }, { v: 'large', top: '17', val: 'チーム以上' }].map(opt => (
                      <button type="button" key={opt.v} className={'form-seg' + (form.size === opt.v ? ' active' : '')} onClick={() => set('size', opt.v)}>
                        <div className="top">{opt.top}</div>
                        <div>{opt.val}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-lg form-submit">決済へ進む(¥15,000 / 年) <Icon name="arrow-right" size={18} /></button>
                <p className="form-note"><Icon name="lock" size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />この後 Stripe の安全な決済画面へ遷移します · <a href="#" style={{ textDecoration: 'underline' }}>プライバシーポリシー</a></p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function CTAStrip() {
  return (
    <section className="cta-strip">
      <div className="container">
        <h2>あなたのリーグの公式サイトを、今日から。</h2>
        <p>年額 ¥15,000(税込)、追加料金なし。まずはお気軽にご相談ください。</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a className="btn btn-primary btn-lg" href="#apply">いますぐ申し込む</a>
          <a className="btn btn-secondary btn-lg" href="/contact">お問い合わせ</a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
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
          <div className="foot-col"><h4>サービス</h4><ul><li><a href="#features">機能一覧</a></li><li><a href="#pricing">料金</a></li><li><a href="#faq">よくあるご質問</a></li><li><a href="#news">ニュース</a></li></ul></div>
          <div className="foot-col"><h4>サポート</h4><ul><li><a href="/contact">お問い合わせ</a></li><li><a href="#">ヘルプセンター</a></li><li><a href="#">運営フロー</a></li></ul></div>
          <div className="foot-col"><h4>会社情報</h4><ul><li><a href="#">運営者情報</a></li><li><a href="/terms">利用規約</a></li><li><a href="/privacy">プライバシーポリシー</a></li><li><a href="/tokusho">特定商取引法に基づく表記</a></li></ul></div>
        </div>
        <div className="foot-bottom">
          <small>© 2026 Leaguru. All rights reserved.</small>
          <small>Made with care for baseball leagues in Japan ⚾</small>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--accent',      ACCENT.accent)
    root.style.setProperty('--accent-soft', ACCENT.accentSoft)
    root.style.setProperty('--accent-deep', ACCENT.accentDeep)
    root.style.setProperty('--accent-ink',  ACCENT.accentInk)
  }, [])
  useReveal()
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <TournamentShowcase />
        <AdminShowcase />
        <LayoutShowcase />
        <ColorPresetShowcase />
        <UseCases />
        <HowItWorks />
        {/* <Testimonials /> — ユーザー獲得後に実際の声に差し替えて復活 */}
        <Pricing />
        {/* <News /> — コンテンツができたら復活 */}
        <FAQ />
        <ContactCTA />
        <ApplicationForm />
        <CTAStrip />
      </main>
      <Footer />
    </>
  )
}
