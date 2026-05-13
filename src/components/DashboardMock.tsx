import Icon from './Icon'

export function DashboardMock() {
  const standings = [
    { rank: 1, mark: 'S', team: 'セントラル・スターズ', g: 12, w: 10, l: 2, pct: '.833', top: true },
    { rank: 2, mark: 'T', team: '多摩川タイガース',      g: 12, w: 9,  l: 3, pct: '.750', top: false },
    { rank: 3, mark: 'B', team: '府中ブルーウェーブ',     g: 12, w: 8,  l: 4, pct: '.667', top: false },
    { rank: 4, mark: 'K', team: '国分寺カージナルス',     g: 11, w: 6,  l: 5, pct: '.545', top: false },
    { rank: 5, mark: 'H', team: '八王子ホークス',         g: 12, w: 5,  l: 7, pct: '.417', top: false },
    { rank: 6, mark: 'Y', team: '横浜ヤンキース',         g: 12, w: 2,  l: 10, pct: '.167', top: false },
  ]
  const sched = [
    { m: 'MAY', d: '11', match: ['スターズ', 'タイガース'], time: '10:00' },
    { m: 'MAY', d: '12', match: ['ブルーウェーブ', 'ホークス'], time: '13:00' },
    { m: 'MAY', d: '18', match: ['カージナルス', 'ヤンキース'], time: '10:00' },
  ]
  return (
    <div className="dash" role="img" aria-label="Leaguruの管理画面プレビュー">
      <div className="dash-bar">
        <span className="dot" style={{ background: '#ff5f57' }} />
        <span className="dot" style={{ background: '#febc2e' }} />
        <span className="dot" style={{ background: '#28c840' }} />
        <span className="url">leaguru.jp/tama-league</span>
      </div>
      <div className="dash-head">
        <div className="league">
          <div className="league-mark">多</div>
          <div>
            <div className="league-name">多摩川草野球リーグ 2026</div>
            <div className="season">SPRING SEASON · 第6週</div>
          </div>
        </div>
        <div className="badge">公開中</div>
      </div>
      <div className="dash-body">
        <div className="dash-pane">
          <h4>順位表 <span className="more">最終更新 5/10 21:34</span></h4>
          <table className="standings">
            <thead>
              <tr>
                <th>順位</th><th>チーム</th>
                <th style={{ textAlign: 'center' }}>試</th>
                <th style={{ textAlign: 'center' }}>勝</th>
                <th style={{ textAlign: 'center' }}>負</th>
                <th style={{ textAlign: 'center' }}>勝率</th>
              </tr>
            </thead>
            <tbody>
              {standings.map(s => (
                <tr key={s.rank} className={s.top ? 'top' : ''}>
                  <td className="rank">{s.rank}</td>
                  <td><span className="team"><span className="team-mark">{s.mark}</span>{s.team}</span></td>
                  <td className="num">{s.g}</td>
                  <td className="num">{s.w}</td>
                  <td className="num">{s.l}</td>
                  <td className="num pct">{s.pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="dash-pane">
          <h4>今週の試合 <span className="more">5/11 - 5/18</span></h4>
          <div className="sched">
            {sched.map((s, i) => (
              <div className="sched-row" key={i}>
                <div className="sched-date"><div className="m">{s.m}</div><div className="d">{s.d}</div></div>
                <div className="sched-match"><span>{s.match[0]}</span><span className="vs">vs</span><span>{s.match[1]}</span></div>
                <div className="sched-time">{s.time}</div>
              </div>
            ))}
          </div>
          <h4 style={{ marginTop: 18 }}>シーズン記録</h4>
          <div className="dash-stats">
            <div className="dash-stat"><div className="lbl">試合数</div><div className="val">71</div></div>
            <div className="dash-stat"><div className="lbl">本塁打</div><div className="val">48</div></div>
            <div className="dash-stat"><div className="lbl">最高打率</div><div className="val">.482</div></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminMock() {
  const nav = [
    { ic: 'chart',     label: 'ダッシュボード', active: false },
    { ic: 'trophy',    label: '順位表',         active: false },
    { ic: 'calendar',  label: '試合・日程',     active: true  },
    { ic: 'ball',      label: '成績入力',       active: false },
    { ic: 'team',      label: 'チーム・選手',   active: false },
    { ic: 'megaphone', label: 'お知らせ',       active: false },
    { ic: 'settings',  label: '設定',           active: false },
  ]
  const batters = [
    { no: '1', name: '山田 太郎', pos: '中堅', ab: 4, h: 2, hr: 0, rbi: 1, avg: '.500' },
    { no: '2', name: '鈴木 健一', pos: '二塁', ab: 4, h: 3, hr: 1, rbi: 3, avg: '.750' },
    { no: '3', name: '佐藤 大輔', pos: '一塁', ab: 3, h: 1, hr: 0, rbi: 0, avg: '.333' },
    { no: '4', name: '田中 翔',   pos: '捕手', ab: 4, h: 0, hr: 0, rbi: 0, avg: '.000' },
  ]
  return (
    <div className="admin" role="img" aria-label="Leaguruの管理画面プレビュー">
      <div className="dash-bar">
        <span className="dot" style={{ background: '#ff5f57' }} />
        <span className="dot" style={{ background: '#febc2e' }} />
        <span className="dot" style={{ background: '#28c840' }} />
        <span className="url" style={{ maxWidth: 360 }}>admin.leaguru.jp/tama-league/matches/2026-05-11</span>
      </div>
      <div className="admin-body">
        <aside className="admin-side">
          <div className="admin-side-head">
            <div className="league-mark">多</div>
            <div>
              <div className="league-name">多摩川草野球リーグ</div>
              <div className="season">管理者:山田 太郎</div>
            </div>
          </div>
          <nav className="admin-nav">
            {nav.map((n, i) => (
              <a key={i} className={'admin-nav-item' + (n.active ? ' active' : '')}>
                <Icon name={n.ic} size={16} stroke={1.6} />
                <span>{n.label}</span>
              </a>
            ))}
          </nav>
          <div className="admin-side-foot">
            <div className="admin-plan">
              <div className="plan-lbl">スタンダードプラン</div>
              <div className="plan-bar"><span style={{ width: '45%' }} /></div>
              <div className="plan-sub">次回更新 2027/03/15</div>
            </div>
          </div>
        </aside>
        <main className="admin-main">
          <div className="admin-bcrumb">
            <span>試合・日程</span><span>›</span>
            <span>2026/05/11</span><span>›</span>
            <span className="cur">試合結果を入力</span>
          </div>
          <div className="admin-title-row">
            <div>
              <h3>試合結果を入力</h3>
              <p>スコアと成績を入力すると、順位表は自動で更新されます。</p>
            </div>
            <div className="admin-actions">
              <button className="abtn abtn-ghost">下書き保存</button>
              <button className="abtn abtn-primary"><Icon name="check" size={14} /> 公開する</button>
            </div>
          </div>
          <div className="admin-card">
            <div className="admin-form-grid">
              <div className="afield"><label>試合日</label><div className="ainput"><Icon name="calendar" size={14} /> 2026年 5月 11日(日)</div></div>
              <div className="afield"><label>開始時刻</label><div className="ainput">10:00</div></div>
              <div className="afield"><label>球場</label><div className="ainput">府中グラウンド A</div></div>
              <div className="afield"><label>審判</label><div className="ainput">高橋 一郎</div></div>
            </div>
            <div className="amatch">
              <div className="amatch-team home">
                <div className="amatch-team-row"><span className="team-mark big">S</span><span className="amatch-team-name">セントラル・スターズ</span></div>
                <div className="amatch-score">7</div>
              </div>
              <div className="amatch-vs">VS</div>
              <div className="amatch-team away">
                <div className="amatch-team-row"><span className="team-mark big" style={{ background: 'var(--navy-100)' }}>T</span><span className="amatch-team-name">多摩川タイガース</span></div>
                <div className="amatch-score">3</div>
              </div>
            </div>
          </div>
          <div className="admin-card">
            <div className="admin-card-head">
              <div>
                <h4>打撃成績(スターズ)</h4>
                <span className="meta">スコアを入力すると個人成績も自動で順位表に反映されます</span>
              </div>
              <button className="abtn abtn-ghost sm"><Icon name="plus" size={12} /> 選手を追加</button>
            </div>
            <table className="abat">
              <thead>
                <tr><th>打順</th><th>選手</th><th>位置</th><th>打数</th><th>安打</th><th>本塁打</th><th>打点</th><th>打率</th></tr>
              </thead>
              <tbody>
                {batters.map((b, i) => (
                  <tr key={i}>
                    <td className="num">{b.no}</td>
                    <td><span className="abat-name">{b.name}</span></td>
                    <td className="num">{b.pos}</td>
                    <td className="num">{b.ab}</td>
                    <td className="num"><span className={'abat-edit' + (b.h > 0 ? ' filled' : '')}>{b.h}</span></td>
                    <td className="num"><span className={'abat-edit' + (b.hr > 0 ? ' filled' : '')}>{b.hr}</span></td>
                    <td className="num">{b.rbi}</td>
                    <td className="num bold">{b.avg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}
