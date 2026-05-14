import LegalLayout from './LegalLayout'

export default function TermsPage() {
  return (
    <LegalLayout title="利用規約">
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 40 }}>最終更新日：2026年5月14日</p>

      <LegalSection title="第1条（適用）">
        <p>本規約は、Leaguru（以下「当サービス」）の利用に関する条件を定めるものです。ユーザーは本規約に同意したうえでサービスをご利用ください。</p>
      </LegalSection>

      <LegalSection title="第2条（利用登録）">
        <p>当サービスへの申し込みは、所定の申込フォームより行ってください。運営者が承認した時点で利用登録が完了します。運営者は、以下の場合に登録を拒否できます。</p>
        <ul>
          <li>申込内容に虚偽・誤記がある場合</li>
          <li>過去に本規約に違反したことがある場合</li>
          <li>その他、運営者が不適切と判断した場合</li>
        </ul>
      </LegalSection>

      <LegalSection title="第3条（料金および支払い）">
        <p>利用料金は年額15,000円（税込）です。決済はStripeを通じたクレジットカード払いにより行います。支払い完了後の返金は原則として承っておりませんが、当サービスの重大な瑕疵による場合はこの限りではありません。</p>
      </LegalSection>

      <LegalSection title="第4条（禁止事項）">
        <p>ユーザーは以下の行為を行ってはなりません。</p>
        <ul>
          <li>法令または公序良俗に違反する行為</li>
          <li>当サービスの運営を妨害する行為</li>
          <li>他のユーザーまたは第三者の権利を侵害する行為</li>
          <li>当サービスのリバースエンジニアリング・複製・改変</li>
          <li>その他、運営者が不適切と判断する行為</li>
        </ul>
      </LegalSection>

      <LegalSection title="第5条（サービスの変更・停止）">
        <p>運営者は、事前に通知することなく当サービスの内容を変更・停止することがあります。これによってユーザーに損害が生じた場合でも、運営者は責任を負いません。</p>
      </LegalSection>

      <LegalSection title="第6条（免責事項）">
        <p>当サービスは現状有姿で提供されます。運営者はサービスの完全性・正確性・有用性について保証しません。当サービスの利用によってユーザーに生じた損害について、運営者の故意または重過失による場合を除き責任を負いません。</p>
      </LegalSection>

      <LegalSection title="第7条（個人情報の取扱い）">
        <p>個人情報の取扱いについては、別途定める<a href="/privacy">プライバシーポリシー</a>に従います。</p>
      </LegalSection>

      <LegalSection title="第8条（規約の変更）">
        <p>運営者は必要に応じて本規約を変更できます。変更後の規約はサービス上に掲示した時点で効力を生じます。</p>
      </LegalSection>

      <LegalSection title="第9条（準拠法・管轄裁判所）">
        <p>本規約は日本法に準拠します。当サービスに関する紛争については、大阪地方裁判所を第一審の専属的合意管轄裁判所とします。</p>
      </LegalSection>
    </LegalLayout>
  )
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy-900)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>{title}</h2>
      <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.85 }}>{children}</div>
    </div>
  )
}
