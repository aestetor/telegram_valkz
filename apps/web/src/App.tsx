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
  const cards = [
    { view: 'profile' as View, icon: 'P', title: 'Анкета', text: 'Заполни профиль, чтобы тебя могли найти.' },
    { view: 'teams' as View, icon: 'T', title: 'Найти команду', text: 'Подбери стак или команду под свой ранг.' },
    { view: 'players' as View, icon: 'A', title: 'Найти игрока', text: 'Найди дуо, трио или пятого в пати.' },
    { view: 'help' as View, icon: '?', title: 'Помощь', text: 'FAQ, правила, заявки, инвайты и жалобы.' },
    { view: 'settings' as View, icon: 'S', title: 'Настройки', text: 'Приватность, статус поиска, город и язык.' },
  ]

  return (
    <div className="page-stack">
      <Card className="hero">
        <p className="eyebrow">Valorant LFG Mini App</p>
        <h1>Найди тиммейтов без хаоса в чате</h1>
        <p>Анкета, поиск команды, поиск игрока, приглашение и катка. Все в одном Mini App.</p>
        <div className="profile-status">
          <span>Анкета: {profile ? `${profile.completion_percent || 0}%` : 'не создана'}</span>
          <span>{profile?.is_visible ? 'показывается в поиске' : 'скрыта'}</span>
          {profile && <span>{searchStatusLabels[normalizeSearchStatus(profile.search_status)]}</span>}
        </div>
      </Card>

      <div className="menu-grid">
        {cards.map((card) => (
          <button key={card.view} className="menu-card" onClick={() => onNavigate(card.view)}>
            <span>{card.icon}</span>
            <strong>{card.title}</strong>
            <small>{card.text}</small>
          </button>
        ))}
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
