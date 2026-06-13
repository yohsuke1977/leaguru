import type { VercelRequest, VercelResponse } from '@vercel/node'

const TO_EMAIL = 'support@leaguru.jp'

const SUBJECT_LABEL: Record<string, string> = {
  general: '一般的なご質問',
  demo: 'デモ・導入相談',
  function: '機能・仕様について',
  other: 'その他',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, email, subject, message, honeypot, loadTime } = req.body ?? {}

  // ハニーポット（ボットは隠しフィールドを埋める）
  if (honeypot) return res.status(200).json({ ok: true })

  // 3秒未満は自動送信とみなして無視
  if (typeof loadTime === 'number' && Date.now() - loadTime < 3000) {
    return res.status(200).json({ ok: true })
  }

  if (!name || !email || !message) return res.status(400).json({ error: 'Missing required fields' })

  // 入力長チェック
  if (String(name).length > 100) return res.status(400).json({ error: 'Name too long' })
  if (String(email).length > 254) return res.status(400).json({ error: 'Email too long' })
  if (String(message).length > 5000) return res.status(400).json({ error: 'Message too long' })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return res.status(500).json({ error: 'Mail not configured' })

  // subject はホワイトリストのみ許可
  const subjectLabel = SUBJECT_LABEL[subject as string] ?? 'その他'

  const mailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'noreply@leaguru.jp',
      to: TO_EMAIL,
      reply_to: String(email).trim(),
      subject: `【leaguru お問い合わせ】${subjectLabel}`,
      text: `種別: ${subjectLabel}\nお名前: ${String(name)}\nメール: ${String(email)}\n\n${String(message)}\n\n──\nleaguru お問い合わせフォーム`,
    }),
  })

  if (!mailRes.ok) {
    console.error('[contact] Resend error', mailRes.status, await mailRes.text())
    return res.status(500).json({ error: 'Failed to send email' })
  }

  return res.status(200).json({ ok: true })
}
