import LegalLayout from './LegalLayout'

export default function TokushoPage() {
  const rows: [string, React.ReactNode][] = [
    ['販売業者',         '※ご自身のお名前または屋号を記載'],
    ['代表者',           '※代表者名を記載'],
    ['所在地',           '※住所を記載（大阪府）'],
    ['電話番号',         '※電話番号を記載（お問い合わせはメールが確実です）'],
    ['メールアドレス',   <a href="mailto:support@leaguru.jp">support@leaguru.jp</a>],
    ['販売URL',          <a href="https://leaguru.jp">https://leaguru.jp</a>],
    ['販売価格',         '¥15,000（税込）/ 1リーグ・年'],
    ['代金以外の費用',   '通信費・デバイス費用はお客様のご負担となります'],
    ['支払い方法',       'クレジットカード（Visa / Mastercard / American Express） / Apple Pay / Google Pay'],
    ['支払い時期',       'お申し込み時に即時決済'],
    ['サービス提供時期', '決済完了後、即日ご利用いただけます'],
    ['返品・キャンセル', 'デジタルコンテンツの性質上、決済完了後の返金は原則承っておりません。ただし当サービスの重大な瑕疵により正常にご利用いただけない場合はこの限りではありません。年度途中での解約の場合、残期間の日割り返金には対応しておりません。'],
    ['動作環境',         '最新版のGoogle Chrome / Safari / Firefox / Edge での動作を推奨します'],
  ]

  return (
    <LegalLayout title="特定商取引法に基づく表記">
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 40 }}>最終更新日：2026年5月14日</p>

      <p style={{ fontSize: 13, background: '#fff8f0', border: '1px solid #fde7d4', borderRadius: 8, padding: '12px 16px', color: '#7a4010', marginBottom: 32 }}>
        ※「※〜を記載」となっている箇所は実際の情報に差し替えてください。
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} style={{ borderBottom: '1px solid var(--line)' }}>
              <th style={{
                textAlign: 'left', padding: '14px 16px 14px 0',
                width: 200, fontWeight: 600, color: 'var(--navy-900)',
                verticalAlign: 'top', whiteSpace: 'nowrap',
              }}>{label}</th>
              <td style={{ padding: '14px 0', color: 'var(--ink-2)', lineHeight: 1.7 }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </LegalLayout>
  )
}
