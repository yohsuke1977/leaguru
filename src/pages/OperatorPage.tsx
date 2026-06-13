import LegalLayout from './LegalLayout'

export default function OperatorPage() {
  return (
    <LegalLayout title="開発者について">
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 40 }}>最終更新日：2026年5月16日</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 40, padding: '24px', background: '#f8fafc', borderRadius: 12 }}>
        <img
          src="/profile.jpg"
          alt="山下陽介"
          style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--accent-soft)' }}
        />
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy-900)' }}>山下 陽介</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>草野球チーム「ガッタマーズ」代表・神戸サタデーベースボールリーグ（SBL）運営スタッフ</div>
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy-900)', marginBottom: 16 }}>草野球歴20年以上。ずっと現場にいました。</h2>
      <p style={{ fontSize: 15, lineHeight: 1.9, color: 'var(--ink-2)', marginBottom: 32 }}>
        神戸を拠点とする草野球チーム「ガッタマーズ」を20年以上運営してきました。
        選手の集まりを作り、対戦相手を探し、日程を調整し、成績を記録する——そのすべてを長年にわたって担ってきた経験があります。
        また、神戸サタデーベースボールリーグ（SBL）をはじめ、複数のリーグ運営にもスタッフとして携わってきました。
      </p>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy-900)', marginBottom: 16 }}>ウェブで、野球がもっと楽しくなる。</h2>
      <p style={{ fontSize: 15, lineHeight: 1.9, color: 'var(--ink-2)', marginBottom: 32 }}>
        ガッタマーズと神戸サタデーベースボールリーグの公式サイトを自分で作ったとき、大きな変化がありました。
        選手や家族が順位表をスマホで確認し、試合結果に一喜一憂してくれる。
        「サイトで見たよ」と声をかけてもらえる。ウェブを通じて、野球がより身近でより楽しいものになっていくのを実感しました。
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.9, color: 'var(--ink-2)', marginBottom: 32 }}>
        一方で、多くのリーグではまだウェブ化が進んでいないのも目の当たりにしてきました。
        日程はLINEで回覧、成績はExcelで管理、順位表は紙で配布——運営担当者がこうした作業に多くの時間を取られているのを見て、
        自分の知識や技術が役に立てるのではないかと、ずっと思い続けていました。
      </p>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy-900)', marginBottom: 16 }}>同じ現場から生まれたサービスです。</h2>
      <p style={{ fontSize: 15, lineHeight: 1.9, color: 'var(--ink-2)', marginBottom: 16 }}>
        Leaguruは、リーグ運営の現場を知っている人間が、運営担当者の負担を本気で減らしたいと思って作りました。
        「使いやすいか」「本当に役に立つか」を判断できるのは、自分自身が長年その立場だったからこそだと思っています。
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.9, color: 'var(--ink-2)', marginBottom: 40 }}>
        リーグを支えてくれている皆さんの手間が少しでも減って、グラウンドで野球を楽しむ時間が増えれば、それがいちばんの喜びです。
      </p>

      <div style={{ background: 'var(--accent-soft)', borderRadius: 12, padding: '20px 24px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7 }}>
        ご質問・ご相談は <a href="mailto:support@leaguru.jp" style={{ color: 'var(--accent-deep)', fontWeight: 600 }}>support@leaguru.jp</a> または <a href="/contact" style={{ color: 'var(--accent-deep)', fontWeight: 600 }}>お問い合わせフォーム</a> からお気軽にどうぞ。
      </div>
    </LegalLayout>
  )
}
