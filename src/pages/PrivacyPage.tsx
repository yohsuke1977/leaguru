import LegalLayout from './LegalLayout'

export default function PrivacyPage() {
  return (
    <LegalLayout title="プライバシーポリシー">
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 40 }}>最終更新日：2026年5月14日</p>

      <LegalSection title="1. 事業者情報">
        <p>本プライバシーポリシーは、Leaguru（リーグル）を運営する事業者（以下「当社」）が、ユーザーの個人情報をどのように収集・利用・保護するかを定めるものです。</p>
      </LegalSection>

      <LegalSection title="2. 収集する情報">
        <p>当社は以下の情報を収集することがあります。</p>
        <ul>
          <li><strong>お問い合わせ時：</strong>氏名、メールアドレス、お問い合わせ内容</li>
          <li><strong>お申し込み時：</strong>リーグ名、担当者名、メールアドレス、電話番号（任意）</li>
          <li><strong>決済時：</strong>クレジットカード情報（Stripeが直接収集・管理します。当社は保持しません）</li>
          <li><strong>サービス利用時：</strong>アクセスログ、ブラウザ情報、利用履歴</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. 利用目的">
        <p>収集した情報は以下の目的で利用します。</p>
        <ul>
          <li>サービスの提供・運営・改善</li>
          <li>お問い合わせへの回答</li>
          <li>重要なお知らせ・システムメンテナンスの通知</li>
          <li>利用規約違反・不正利用への対応</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. 第三者への提供">
        <p>当社は、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。</p>
        <ul>
          <li>ユーザーの同意がある場合</li>
          <li>法令に基づき開示が必要な場合</li>
          <li>人命・身体・財産の保護のために必要で、本人の同意を得ることが困難な場合</li>
        </ul>
        <p style={{ marginTop: 12 }}>なお、決済処理にはStripe, Inc.を利用しており、必要な範囲で情報が共有されます。Stripeのプライバシーポリシーはstripe.com/jp/privacyをご参照ください。</p>
      </LegalSection>

      <LegalSection title="5. Cookieおよびアクセス解析">
        <p>当サービスはGoogle Analyticsを使用してアクセス状況を分析することがあります。Cookieを通じて収集される情報は匿名であり、個人を特定するものではありません。ブラウザの設定でCookieを無効にすることもできます。</p>
      </LegalSection>

      <LegalSection title="6. 安全管理措置">
        <p>当社は個人情報の漏洩・滅失・毀損を防止するため、適切な安全管理措置を講じます。パスワードはハッシュ化して保存し、通信はSSL/TLSで暗号化しています。</p>
      </LegalSection>

      <LegalSection title="7. 開示・訂正・削除">
        <p>ユーザーは当社が保有する自己の個人情報について、開示・訂正・削除を請求できます。下記お問い合わせ先までご連絡ください。</p>
      </LegalSection>

      <LegalSection title="8. お問い合わせ">
        <p>本ポリシーに関するご質問・ご意見は以下までお寄せください。</p>
        <p>メール：<a href="mailto:support@leaguru.jp">support@leaguru.jp</a></p>
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
