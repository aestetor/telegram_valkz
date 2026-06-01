import { useEffect, useState } from 'react'
import { api } from './api'
import ProfilePage from './components/ProfilePage'
import TeamsPage from './components/TeamsPage'
import PlayersPage from './components/PlayersPage'
import { Button, Card, Input } from './components/ui'
import type { Options, Profile, SearchStatus } from './types'
import { normalizeSearchStatus, searchStatusLabels, searchStatusOptions } from './types'

type View = 'home' | 'profile' | 'teams' | 'players' | 'help' | 'settings'

const defaultReportReasons = ['Токсичность', 'Оскорбления', 'Спам', 'Фейковая анкета', 'Неадекватное поведение', 'Реклама', 'Другое']

const defaultOptions: Options = {
  ranks: [],
  roles: [],
  microphone_values: [],
  favorite_modes: [],
  goals: [],
  age_ranges: [],
  play_times: [],
  team_goals: [],
  team_formats: [],
  microphone_requirements: [],
  search_statuses: searchStatusOptions,
  report_reasons: defaultReportReasons,
}

function Home({ onNavigate, profile }: { onNavigate: (view: View) => void; profile: Profile | null }) {
  const pct = profile?.completion_percent ?? 0
  const r = 20
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="page-stack">
      <Card className="hero">
        <p className="eyebrow">Valorant LFG</p>
        <h1>Найди тиммейтов без лишнего шума</h1>
        <p className="muted" style={{ margin: 0 }}>Анкета, команды, инвайты — всё в одном месте.</p>
        <div className="status-badges">
          {profile ? (
            <>
              <span className={`badge ${pct === 100 ? 'badge-green' : pct > 0 ? '' : 'badge-red'}`}>
                Анкета {pct}%
              </span>
              <span className={`badge ${profile.is_visible ? 'badge-green' : ''}`}>
                {profile.is_visible ? '👁 Виден в поиске' : 'Скрыт'}
              </span>
              <span className="badge">{searchStatusLabels[normalizeSearchStatus(profile.search_status)]}</span>
            </>
          ) : (
            <span className="badge badge-red">Анкета не создана</span>
          )}
        </div>
      </Card>

      <div className="home-grid">
        <button className="menu-card mc-featured mc-teams" onClick={() => onNavigate('teams')}>
          <span className="card-icon">🛡️</span>
          <strong>Найти команду</strong>
          <small>Подбери стак или команду под свой ранг и цели</small>
          <span className="card-arrow">→</span>
        </button>

        <button className="menu-card mc-featured mc-players" onClick={() => onNavigate('players')}>
          <span className="card-icon">🎯</span>
          <strong>Найти игрока</strong>
          <small>Дуо, трио или последний слот в пати</small>
          <span className="card-arrow">→</span>
        </button>

        <button className="menu-card mc-profile" onClick={() => onNavigate('profile')}>
          <div className="mc-profile-left">
            <span className="mc-profile-icon">👤</span>
            <div className="mc-profile-text">
              <strong>Анкета</strong>
              <small>
                {profile
                  ? (profile.valorant_nickname || 'Заполни профиль')
                  : 'Создай анкету, чтобы тебя находили'}
              </small>
            </div>
          </div>
          <div className="pct-ring">
            <svg viewBox="0 0 48 48">
              <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="4" />
              <circle
                cx="24" cy="24" r={r}
                fill="none"
                stroke="#ff4655"
                strokeWidth="4"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="pct-ring-num">{pct}%</span>
          </div>
          <span className="card-arrow">→</span>
        </button>

        <button className="menu-card mc-small" onClick={() => onNavigate('settings')}>
          <span className="card-icon">⚙️</span>
          <strong>Настройки</strong>
          <small>Приватность и статус поиска</small>
          <span className="card-arrow">→</span>
        </button>

        <button className="menu-card mc-small" onClick={() => onNavigate('help')}>
          <span className="card-icon">📖</span>
          <strong>Помощь</strong>
          <small>FAQ, правила и жалобы</small>
          <span className="card-arrow">→</span>
        </button>
      </div>
    </div>
  )
}

function HelpPage() {
  return (
    <div className="page-stack">
      <Card>
        <p className="eyebrow">Помощь</p>
        <h2>FAQ и правила</h2>
        <div className="faq-list">
          <section>
            <h3>Как попасть в поиск?</h3>
            <p className="muted">Заполни анкету, включи видимость и выбери статус поиска. Статус "Активно ищу" означает, что ты сейчас готов принимать инвайты и заявки.</p>
          </section>
          <section>
            <h3>Как работают инвайты игрокам?</h3>
            <p className="muted">В поиске игроков можно отправить приглашение с коротким сообщением. Получатель принимает или отклоняет его, а отправитель может отменить pending-инвайт.</p>
          </section>
          <section>
            <h3>Как работают заявки в команды?</h3>
            <p className="muted">Выбери команду, откликнись и укажи, чем подходишь. Капитан увидит заявку и сможет принять или отклонить ее.</p>
          </section>
          <section>
            <h3>Когда виден Telegram?</h3>
            <p className="muted">Контакт показывается только после принятия инвайта или заявки, если API вернул username пользователя. В обычном поиске контакты скрыты.</p>
          </section>
          <section>
            <h3>Правила и жалобы</h3>
            <p className="muted">Не спамь, не токсичь, не выдавай себя за другого игрока и не публикуй чужие контакты. На игрока или команду можно отправить жалобу с причиной и комментарием.</p>
          </section>
        </div>
      </Card>
    </div>
  )
}

function SettingsPage({ profile, onProfileChanged }: { profile: Profile | null; onProfileChanged: (profile: Profile) => void }) {
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [notifications, setNotifications] = useState(() => localStorage.getItem('settings.notifications') !== 'off')
  const [language, setLanguage] = useState(() => localStorage.getItem('settings.language') || 'ru')
  const [defaultCity, setDefaultCity] = useState(() => localStorage.getItem('settings.defaultCity') || profile?.city || '')

  async function saveProfileSettings(next: { is_visible?: boolean; search_status?: SearchStatus }) {
    if (!profile) return
    setSaving(true)
    setStatus('')
    try {
      const updated = await api.saveProfile({
        valorant_nickname: profile.valorant_nickname,
        riot_id: profile.riot_id,
        rank: profile.rank,
        roles: profile.roles,
        city: profile.city,
        age_range: profile.age_range,
        microphone: profile.microphone,
        favorite_modes: profile.favorite_modes,
        goals: profile.goals,
        about: profile.about,
        is_visible: next.is_visible ?? profile.is_visible,
        search_status: next.search_status ?? normalizeSearchStatus(profile.search_status),
      })
      onProfileChanged(updated)
      setStatus('Настройки анкеты сохранены')
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось сохранить настройки')
    } finally {
      setSaving(false)
    }
  }

  function saveLocalSettings() {
    localStorage.setItem('settings.notifications', notifications ? 'on' : 'off')
    localStorage.setItem('settings.language', language)
    localStorage.setItem('settings.defaultCity', defaultCity)
    setStatus('Локальные настройки сохранены')
  }

  return (
    <div className="page-stack">
      <Card>
        <p className="eyebrow">Настройки</p>
        <h2>Приватность и поиск</h2>
        {profile ? (
          <>
            <label className="switch-row">
              <span>Показывать анкету в поиске</span>
              <input type="checkbox" checked={profile.is_visible} disabled={saving} onChange={(event) => saveProfileSettings({ is_visible: event.target.checked })} />
            </label>
            <label className="field">
              <span>Статус поиска</span>
              <select value={normalizeSearchStatus(profile.search_status)} disabled={saving} onChange={(event) => saveProfileSettings({ search_status: event.target.value as SearchStatus })}>
                {searchStatusOptions.map((value) => (
                  <option key={value} value={value}>{searchStatusLabels[value]}</option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <p className="notice">Сначала создай анкету.</p>
        )}
      </Card>

      <Card>
        <p className="eyebrow">Локально</p>
        <h2>Удобство</h2>
        <label className="switch-row">
          <span>Уведомления в интерфейсе</span>
          <input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} />
        </label>
        <label className="field">
          <span>Язык</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </label>
        <Input label="Город по умолчанию" value={defaultCity} onChange={setDefaultCity} placeholder="Алматы" />
        <Button onClick={saveLocalSettings} variant="secondary">Сохранить локально</Button>
        {status && <p className="notice">{status}</p>}
      </Card>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [options, setOptions] = useState<Options>(defaultOptions)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')

  async function bootstrap() {
    setError('')
    try {
      const [optionsData, profileData] = await Promise.all([api.options(), api.getProfile()])
      setOptions({ ...defaultOptions, ...optionsData })
      setProfile(profileData)
      if (!profileData) setView('profile')
    } catch (event) {
      setError(event instanceof Error ? event.message : 'Не удалось загрузить приложение')
    }
  }

  useEffect(() => {
    bootstrap()
  }, [])

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')}>VLR LFG</button>
        {view !== 'home' && <Button onClick={() => setView('home')} variant="ghost">Главная</Button>}
      </header>

      {error && <Card><p className="error">{error}</p><Button onClick={bootstrap}>Повторить</Button></Card>}

      {!error && view === 'home' && <Home onNavigate={setView} profile={profile} />}
      {!error && view === 'profile' && <ProfilePage options={options} initialProfile={profile} onSaved={setProfile} />}
      {!error && view === 'teams' && <TeamsPage options={options} />}
      {!error && view === 'players' && <PlayersPage options={options} />}
      {!error && view === 'help' && <HelpPage />}
      {!error && view === 'settings' && <SettingsPage profile={profile} onProfileChanged={setProfile} />}
    </main>
  )
}
