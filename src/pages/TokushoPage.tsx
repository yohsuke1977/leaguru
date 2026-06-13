import LegalLayout from './LegalLayout'

export default function TokushoPage() {
  const rows: [string, React.ReactNode][] = [
    ['販売業者',         'Zen Works'],
    ['代表者',           '山下 陽介'],
    ['所在地',           '〒651-0084 兵庫県神戸市中央区磯辺通1丁目1番18号カサベラ国際プラザビル707号室'],
    ['電話番号',         <a href="/contact" style={{ color: 'inherit' }}>お問い合わせフォームよりご連絡ください</a>],
    ['メールアドレス',   <a href="mailto:support@leaguru.jp">support@leaguru.jp</a>],
    ['販売URL',          <a href="https://leaguru.jp">https://leaguru.jp</a>],
    ['販売価格',         '¥18,000（税込）/ 1リーグ・年'],
    ['代金以外の費用',   '通信費・デバイス費用はお客様のご負担となります'],
    ['支払い方法',       'クレジットカード（Visa / Mastercard / American Express） / Apple Pay / Google Pay'],
    ['支払い時期',       'お申し込み時に即時決済'],
    ['サービス提供時期', '決済完了後、即日ご利用いただけます'],
    ['返品・キャンセル', 'デジタルコンテンツの性質上、決済完了後の返金は原則承っておりません。ただし当サービスの重大な瑕疵により正常にご利用いただけない場合はこの限りではありません。年度途中での解約の場合、残期間の日割り返金には対応しておりません。'],
    ['動作環境',         '最新版のGoogle Chrome / Safari / Firefox / Edge での動作を推奨します'],
  ]

  return (
    <LegalLayout title="特定商取引法に基づく表記">
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 40 }}>最終更新日：2026年5月18日</p>

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
