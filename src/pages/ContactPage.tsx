import { useRef, useState } from 'react'
import Icon from '../components/Icon'
import LegalLayout from './LegalLayout'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'general', message: '' })
  const [status, setStatus] = useState<Status>('idle')
  const loadTimeRef = useRef(Date.now())
  const honeypotRef = useRef<HTMLInputElement>(null)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        loadTime: loadTimeRef.current,
        honeypot: honeypotRef.current?.value ?? '',
      }),
    })
    setStatus(res.ok ? 'sent' : 'error')
  }

  return (
    <LegalLayout title="お問い合わせ">
      <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 40 }}>
        機能・料金・導入方法など、お気軽にご相談ください。
        申し込み前のご質問・デモのご要望も歓迎しています。
        担当者より<strong>2営業日以内</strong>にご返信いたします。
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 40, alignItems: 'start' }}>
        <div>
          <div className="contact-channel" style={{ marginBottom: 20 }}>
            <span className="ic"><Icon name="megaphone" size={16} /></span>
            <div><b>メールサポート</b><small>support@leaguru.jp</small><small>平日 10:00〜18:00</small></div>
          </div>
        </div>

        <div className="contact-card">
          {status === 'sent' ? (
            <div className="form-success">
              <Icon name="check" size={28} />
              <div style={{ fontSize: 16, marginTop: 4 }}>お問い合わせを受け付けました</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>2営業日以内にご返信いたします。</div>
              <a href="/" className="btn btn-ghost" style={{ marginTop: 16, fontSize: 13 }}>トップへ戻る</a>
            </div>
          ) : (
            <form onSubmit={submit}>
              {/* ハニーポット：人間には表示しない */}
              <input ref={honeypotRef} name="honeypot" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              <div className="form-row"><label>お名前 <span className="req">必須</span></label><input type="text" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="例：山田 太郎" /></div>
              <div className="form-row"><label>メールアドレス <span className="req">必須</span></label><input type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="example@league.jp" /></div>
              <div className="form-row">
                <label>お問い合わせ種別 <span className="req">必須</span></label>
                <select required value={form.subject} onChange={e => set('subject', e.target.value)}>
                  <option value="general">一般的なご質問</option>
                  <option value="demo">デモ・導入相談</option>
                  <option value="function">機能・仕様について</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div className="form-row"><label>お問い合わせ内容 <span className="req">必須</span></label><textarea required value={form.message} onChange={e => set('message', e.target.value)} placeholder="ご質問・ご相談内容をご記入ください" /></div>
              {status === 'error' && <p style={{ color: '#991b1b', fontSize: 13, marginBottom: 8 }}>送信に失敗しました。時間をおいて再度お試しください。</p>}
              <button type="submit" className="btn btn-primary btn-lg form-submit" disabled={status === 'sending'}>
                {status === 'sending' ? '送信中…' : <>送信する <Icon name="arrow-right" size={18} /></>}
              </button>
              <p className="form-note">ご入力情報は<a href="/privacy" style={{ textDecoration: 'underline' }}>プライバシーポリシー</a>に基づき適切に取り扱います</p>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .contact-two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </LegalLayout>
  )
}
