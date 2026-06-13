export default function SuccessPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#f4f6fa',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '48px 40px', maxWidth: 480,
        width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,.08)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: '#dcfce7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: 32,
        }}>✓</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', marginBottom: 12 }}>
          お申し込みありがとうございます！
        </h1>
        <p style={{ color: '#555', lineHeight: 1.8, marginBottom: 8 }}>
          決済が完了しました。<br />
          管理画面の開設準備が整い次第、登録メールアドレスへご連絡いたします。
        </p>
        <p style={{ color: '#888', fontSize: 13, lineHeight: 1.8, marginBottom: 32 }}>
          30日間の無料トライアル期間中です。<br />
          ご不明な点はお気軽にお問い合わせください。
        </p>
        <a href="/" style={{
          display: 'inline-block', background: '#1a6b3a', color: '#fff',
          borderRadius: 8, padding: '12px 32px', fontWeight: 700, fontSize: 15,
          textDecoration: 'none',
        }}>
          トップページへ戻る
        </a>
      </div>
    </div>
  )
}
