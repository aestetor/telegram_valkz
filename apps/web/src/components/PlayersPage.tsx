import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Options, PlayerInvite, Profile } from '../types'
import { normalizeSearchStatus, searchStatusLabels } from '../types'
import { Button, Card, EmptyState, Input, Select, Textarea } from './ui'

type PlayerReportTarget = {
  profile: Profile
}

function telegramLink(profile?: Profile | null) {
  return profile?.user?.username ? `https://t.me/${profile.user.username}` : null
}

export default function PlayersPage({ options }: { options: Options }) {
  const reportReasons = options.report_reasons?.length ? options.report_reasons : ['Токсичность', 'Оскорбления', 'Спам', 'Фейковая анкета', 'Неадекватное поведение', 'Реклама', 'Другое']
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [incoming, setIncoming] = useState<PlayerInvite[]>([])
  const [outgoing, setOutgoing] = useState<PlayerInvite[]>([])
  const [filters, setFilters] = useState({ rank: '', role: '', city: '', microphone: '', mode: '', goal: '', age_range: '' })
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [reportTarget, setReportTarget] = useState<PlayerReportTarget | null>(null)
  const [reportReason, setReportReason] = useState(reportReasons[0])
  const [reportComment, setReportComment] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    setStatus('')
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => value && params.set(key, value))
      const [profilesData, incomingData, outgoingData] = await Promise.all([
        api.listProfiles(params),
        api.listPlayerInvites('incoming'),
        api.listPlayerInvites('outgoing'),
      ])
      setProfiles(profilesData)
      setIncoming(incomingData)
      setOutgoing(outgoingData)
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Ошибка загрузки игроков')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!reportReasons.includes(reportReason)) {
      setReportReason(reportReasons[0])
    }
  }, [reportReason, reportReasons])

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function setPreset(preset: 'duo' | 'ranked' | 'city' | 'mic') {
    setFilters((current) => {
      if (preset === 'duo') return { ...current, goal: 'Найти дуо', mode: 'Ranked', microphone: 'Да' }
      if (preset === 'ranked') return { ...current, mode: 'Ranked' }
      if (preset === 'mic') return { ...current, microphone: 'Да' }
      return current
    })
  }

  async function invite(profile: Profile) {
    setStatus('')
    try {
      await api.invitePlayer(profile.id, inviteMessage)
      setInviteMessage('')
      setSelectedProfile(null)
      await load()
      setStatus(`Приглашение для ${profile.valorant_nickname} отправлено`)
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось отправить приглашение')
    }
  }

  async function respond(inviteId: number, action: 'accept' | 'reject' | 'cancel') {
    setStatus('')
    try {
      await api.respondPlayerInvite(inviteId, action)
      await load()
      setStatus(action === 'accept' ? 'Приглашение принято' : action === 'reject' ? 'Приглашение отклонено' : 'Приглашение отменено')
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось обработать приглашение')
    }
  }

  async function submitReport() {
    if (!reportTarget) return
    setStatus('')
    try {
      await api.report({
        reported_user_id: reportTarget.profile.user_id,
        team_id: null,
        reason: reportReason,
        comment: reportComment || null,
      })
      setReportTarget(null)
      setReportComment('')
      setStatus('Жалоба отправлена на модерацию')
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось отправить жалобу')
    }
  }

  return (
    <div className="page-stack">
      <Card>
        <p className="eyebrow">Найти игрока</p>
        <h2>Подбор тиммейтов</h2>
        <p className="muted">Ищи дуо, трио или пятого игрока в стак по рангу, роли, городу и вайбу.</p>
        <div className="quick-actions">
          <Button onClick={() => setPreset('duo')} variant="secondary">Найти дуо</Button>
          <Button onClick={() => setPreset('ranked')} variant="secondary">Ranked</Button>
          <Button onClick={() => setPreset('mic')} variant="secondary">Только с микрофоном</Button>
        </div>
        <div className="filters">
          <Select label="Ранг" value={filters.rank} onChange={(value) => updateFilter('rank', value)} options={options.ranks} placeholder="Любой" />
          <Select label="Роль" value={filters.role} onChange={(value) => updateFilter('role', value)} options={options.roles} placeholder="Любая" />
          <Input label="Город" value={filters.city} onChange={(value) => updateFilter('city', value)} placeholder="Любой" />
          <Select label="Микрофон" value={filters.microphone} onChange={(value) => updateFilter('microphone', value)} options={options.microphone_values} placeholder="Неважно" />
          <Select label="Режим" value={filters.mode} onChange={(value) => updateFilter('mode', value)} options={options.favorite_modes} placeholder="Любой" />
          <Select label="Цель" value={filters.goal} onChange={(value) => updateFilter('goal', value)} options={options.goals} placeholder="Любая" />
          <Select label="Возраст" value={filters.age_range} onChange={(value) => updateFilter('age_range', value)} options={options.age_ranges} placeholder="Неважно" />
        </div>
        <Button onClick={load}>{loading ? 'Ищу...' : 'Применить фильтры'}</Button>
        {status && <p className="notice">{status}</p>}
      </Card>

      {incoming.length > 0 && (
        <Card>
          <h3>Входящие приглашения</h3>
          {incoming.map((invite) => {
            const contact = invite.status === 'accepted' ? telegramLink(invite.from_profile) : null
            return (
              <div className="list-item" key={invite.id}>
                <div>
                  <strong>{invite.from_profile?.valorant_nickname || 'Игрок'}</strong>
                  <p className="muted">{invite.from_profile?.rank} · {invite.from_profile?.roles.join(', ')} · {invite.status}</p>
                  {invite.message && <p>{invite.message}</p>}
                </div>
                <div className="row-actions">
                  {invite.status === 'pending' && (
                    <>
                      <Button onClick={() => respond(invite.id, 'accept')} variant="secondary">Принять</Button>
                      <Button onClick={() => respond(invite.id, 'reject')} variant="danger">Отклонить</Button>
                    </>
                  )}
                  {contact && <a className="btn btn-ghost" href={contact} target="_blank" rel="noreferrer">Telegram</a>}
                </div>
              </div>
            )
          })}
        </Card>
      )}

      {outgoing.length > 0 && (
        <Card>
          <h3>Исходящие приглашения</h3>
          {outgoing.slice(0, 5).map((invite) => {
            const contact = invite.status === 'accepted' ? telegramLink(invite.to_profile) : null
            return (
              <div className="list-item" key={invite.id}>
                <div>
                  <strong>{invite.to_profile?.valorant_nickname || 'Игрок'}</strong>
                  <p className="muted">{invite.to_profile?.rank} · {invite.status}</p>
                </div>
                <div className="row-actions">
                  {invite.status === 'pending' && <Button onClick={() => respond(invite.id, 'cancel')} variant="ghost">Отменить</Button>}
                  {contact && <a className="btn btn-ghost" href={contact} target="_blank" rel="noreferrer">Telegram</a>}
                </div>
              </div>
            )
          })}
        </Card>
      )}

      <div className="cards-list">
        {profiles.length === 0 && <EmptyState title="Игроки не найдены" text="Попробуй снять фильтры или проверь, что твоя анкета заполнена." />}
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <div className="section-head compact">
              <div>
                <h3>{profile.valorant_nickname}</h3>
                {profile.riot_id && <p className="muted">{profile.riot_id}</p>}
              </div>
              <span className={`badge ${profile.search_status === 'actively_looking' ? 'badge-green' : ''}`}>{searchStatusLabels[normalizeSearchStatus(profile.search_status)]}</span>
            </div>
            <div className="mini-grid">
              <span>Ранг: {profile.rank}</span>
              <span>Роли: {profile.roles.join(', ')}</span>
              <span>Город: {profile.city}</span>
              <span>Микрофон: {profile.microphone}</span>
              <span>Режимы: {profile.favorite_modes.join(', ')}</span>
              <span>Цели: {profile.goals.join(', ')}</span>
            </div>
            {profile.about && <p className="about">{profile.about}</p>}
            {selectedProfile?.id === profile.id && (
              <div className="invite-box">
                <Textarea label="Комментарий к приглашению" value={inviteMessage} onChange={setInviteMessage} placeholder="Привет, го ranked вечером?" maxLength={500} />
                <Button onClick={() => invite(profile)}>Отправить приглашение</Button>
              </div>
            )}
            {reportTarget?.profile.id === profile.id && (
              <div className="invite-box">
                <Select label="Причина жалобы" value={reportReason} onChange={setReportReason} options={reportReasons} />
                <Textarea label="Комментарий" value={reportComment} onChange={setReportComment} placeholder="Коротко опиши проблему" maxLength={500} />
                <div className="row-actions">
                  <Button onClick={submitReport} variant="danger">Отправить жалобу</Button>
                  <Button onClick={() => setReportTarget(null)} variant="ghost">Отмена</Button>
                </div>
              </div>
            )}
            <div className="row-actions">
              <Button onClick={() => setSelectedProfile(selectedProfile?.id === profile.id ? null : profile)} variant="secondary">
                {selectedProfile?.id === profile.id ? 'Свернуть' : 'Пригласить'}
              </Button>
              <Button onClick={() => setReportTarget(reportTarget?.profile.id === profile.id ? null : { profile })} variant="ghost">
                Жалоба
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
