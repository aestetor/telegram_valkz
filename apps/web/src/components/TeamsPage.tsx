import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Options, Team, TeamApplication, TeamPayload } from '../types'
import { Button, Card, EmptyState, Input, MultiSelect, Select, Textarea } from './ui'

const rankRanges = [
  'Iron-Bronze',
  'Silver-Gold',
  'Gold-Platinum',
  'Platinum-Diamond',
  'Diamond-Ascendant',
  'Ascendant-Immortal',
  'Immortal+',
  'Любой',
]

const emptyTeam: TeamPayload = {
  name: '',
  description: '',
  rank_range: '',
  needed_roles: [],
  city: '',
  format: 'Онлайн',
  modes: [],
  current_players_count: 1,
  needed_players_count: 1,
  microphone_requirement: 'Неважно',
  play_time: '',
  goal: '',
  is_visible: true,
}

function telegramLink(application: TeamApplication) {
  const username = application.profile?.user?.username
  return application.status === 'accepted' && username ? `https://t.me/${username}` : null
}

export default function TeamsPage({ options }: { options: Options }) {
  const reportReasons = options.report_reasons?.length ? options.report_reasons : ['Токсичность', 'Оскорбления', 'Спам', 'Фейковая анкета', 'Неадекватное поведение', 'Реклама', 'Другое']
  const [teams, setTeams] = useState<Team[]>([])
  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [applications, setApplications] = useState<TeamApplication[]>([])
  const [filters, setFilters] = useState({ rank_range: '', role: '', city: '', format: '', mode: '', microphone_requirement: '', goal: '', play_time: '' })
  const [form, setForm] = useState<TeamPayload>(emptyTeam)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [reportTeam, setReportTeam] = useState<Team | null>(null)
  const [reportReason, setReportReason] = useState(reportReasons[0])
  const [reportComment, setReportComment] = useState('')
  const [applicationMessage, setApplicationMessage] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    setStatus('')
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => value && params.set(key, value))
      const [teamsData, myTeamData, appsData] = await Promise.all([
        api.listTeams(params),
        api.getMyTeam(),
        api.listTeamApplications(),
      ])
      setTeams(teamsData)
      setMyTeam(myTeamData)
      setApplications(appsData)
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Ошибка загрузки команд')
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

  function updateForm<K extends keyof TeamPayload>(key: K, value: TeamPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function createTeam() {
    setStatus('')
    try {
      const created = await api.createTeam({ ...form, city: form.city || null, play_time: form.play_time || null })
      setMyTeam(created)
      setShowCreate(false)
      setForm(emptyTeam)
      await load()
      setStatus('Команда создана')
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось создать команду')
    }
  }

  async function apply(team: Team) {
    setStatus('')
    try {
      await api.applyToTeam(team.id, applicationMessage)
      setApplicationMessage('')
      setSelectedTeam(null)
      setStatus(`Заявка в ${team.name} отправлена`)
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось отправить заявку')
    }
  }

  async function respond(applicationId: number, action: 'accept' | 'reject') {
    setStatus('')
    try {
      await api.respondTeamApplication(applicationId, action)
      await load()
      setStatus(action === 'accept' ? 'Заявка принята' : 'Заявка отклонена')
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось обработать заявку')
    }
  }

  async function toggleTeamVisibility() {
    if (!myTeam) return
    try {
      await api.updateTeam(myTeam.id, { ...myTeam, is_visible: !myTeam.is_visible, status: myTeam.status })
      await load()
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось обновить команду')
    }
  }

  async function closeRecruitment() {
    if (!myTeam) return
    try {
      await api.updateTeam(myTeam.id, { ...myTeam, status: myTeam.status === 'active' ? 'closed' : 'active' })
      await load()
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось обновить статус')
    }
  }

  async function submitReport() {
    if (!reportTeam) return
    setStatus('')
    try {
      await api.report({
        reported_user_id: null,
        team_id: reportTeam.id,
        reason: reportReason,
        comment: reportComment || null,
      })
      setReportTeam(null)
      setReportComment('')
      setStatus('Жалоба отправлена на модерацию')
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось отправить жалобу')
    }
  }

  return (
    <div className="page-stack">
      <Card>
        <div className="section-head">
          <div>
            <p className="eyebrow">Найти команду</p>
            <h2>Команды, которые ищут игроков</h2>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} variant="secondary">{showCreate ? 'Закрыть' : 'Создать'}</Button>
        </div>
        <div className="filters">
          <Select label="Ранг" value={filters.rank_range} onChange={(value) => updateFilter('rank_range', value)} options={rankRanges} placeholder="Любой" />
          <Select label="Роль" value={filters.role} onChange={(value) => updateFilter('role', value)} options={options.roles} placeholder="Любая" />
          <Input label="Город" value={filters.city} onChange={(value) => updateFilter('city', value)} placeholder="Любой" />
          <Select label="Формат" value={filters.format} onChange={(value) => updateFilter('format', value)} options={options.team_formats} placeholder="Любой" />
          <Select label="Режим" value={filters.mode} onChange={(value) => updateFilter('mode', value)} options={options.favorite_modes} placeholder="Любой" />
          <Select label="Микрофон" value={filters.microphone_requirement} onChange={(value) => updateFilter('microphone_requirement', value)} options={options.microphone_requirements} placeholder="Любой" />
          <Select label="Цель" value={filters.goal} onChange={(value) => updateFilter('goal', value)} options={options.team_goals} placeholder="Любая" />
          <Select label="Время" value={filters.play_time} onChange={(value) => updateFilter('play_time', value)} options={options.play_times} placeholder="Любое" />
        </div>
        <Button onClick={load}>{loading ? 'Ищу...' : 'Применить фильтры'}</Button>
        {status && <p className="notice">{status}</p>}
      </Card>

      {showCreate && (
        <Card>
          <h3>Создать команду</h3>
          <div className="form-grid">
            <Input label="Название" value={form.name} onChange={(value) => updateForm('name', value)} placeholder="Team Phantom" />
            <Select label="Ранг команды" value={form.rank_range} onChange={(value) => updateForm('rank_range', value)} options={rankRanges} />
            <Input label="Город" value={form.city || ''} onChange={(value) => updateForm('city', value)} placeholder="Алматы или пусто" />
            <Select label="Формат" value={form.format} onChange={(value) => updateForm('format', value)} options={options.team_formats} />
            <Select label="Микрофон" value={form.microphone_requirement} onChange={(value) => updateForm('microphone_requirement', value)} options={options.microphone_requirements} />
            <Select label="Время игры" value={form.play_time || ''} onChange={(value) => updateForm('play_time', value)} options={options.play_times} />
            <Select label="Цель" value={form.goal} onChange={(value) => updateForm('goal', value)} options={options.team_goals} />
            <Input label="Игроков сейчас" type="number" value={String(form.current_players_count)} onChange={(value) => updateForm('current_players_count', Number(value))} />
            <Input label="Ищем игроков" type="number" value={String(form.needed_players_count)} onChange={(value) => updateForm('needed_players_count', Number(value))} />
          </div>
          <MultiSelect label="Нужные роли" values={form.needed_roles} onChange={(values) => updateForm('needed_roles', values)} options={options.roles} />
          <MultiSelect label="Режимы" values={form.modes} onChange={(values) => updateForm('modes', values)} options={options.favorite_modes} />
          <Textarea label="Описание" value={form.description || ''} onChange={(value) => updateForm('description', value)} placeholder="Играем вечером, нужен спокойный Controller." maxLength={600} />
          <Button onClick={createTeam}>Создать команду</Button>
        </Card>
      )}

      {myTeam && (
        <Card className="accent-card">
          <p className="eyebrow">Моя команда</p>
          <h3>{myTeam.name}</h3>
          <p>{myTeam.rank_range} · {myTeam.needed_roles.join(', ')} · {myTeam.current_players_count}/5</p>
          <p className="muted">Статус: {myTeam.status} · Видимость: {myTeam.is_visible ? 'показывается' : 'скрыта'}</p>
          <div className="row-actions">
            <Button onClick={toggleTeamVisibility} variant="secondary">{myTeam.is_visible ? 'Скрыть' : 'Показать'}</Button>
            <Button onClick={closeRecruitment} variant="secondary">{myTeam.status === 'active' ? 'Закрыть набор' : 'Открыть набор'}</Button>
          </div>
        </Card>
      )}

      {applications.length > 0 && (
        <Card>
          <h3>Заявки в мою команду</h3>
          {applications.map((application) => {
            const contact = telegramLink(application)
            return (
              <div className="list-item" key={application.id}>
                <div>
                  <strong>{application.profile?.valorant_nickname || 'Игрок'}</strong>
                  <p className="muted">{application.profile?.rank} · {application.profile?.roles.join(', ')} · {application.status}</p>
                  {application.message && <p>{application.message}</p>}
                </div>
                <div className="row-actions">
                  {application.status === 'pending' && (
                    <>
                      <Button onClick={() => respond(application.id, 'accept')} variant="secondary">Принять</Button>
                      <Button onClick={() => respond(application.id, 'reject')} variant="danger">Отклонить</Button>
                    </>
                  )}
                  {contact && <a className="btn btn-ghost" href={contact} target="_blank" rel="noreferrer">Telegram</a>}
                </div>
              </div>
            )
          })}
        </Card>
      )}

      <div className="cards-list">
        {teams.length === 0 && <EmptyState title="Команды не найдены" text="Попробуй снять фильтры или создай свою команду." />}
        {teams.map((team) => (
          <Card key={team.id}>
            <div className="section-head compact">
              <div>
                <h3>{team.name}</h3>
                <p className="muted">{team.rank_range} · {team.needed_roles.join(', ') || 'Любая роль'}</p>
              </div>
              <span className="badge">{team.current_players_count}/5</span>
            </div>
            <div className="mini-grid">
              <span>Город: {team.city || team.format}</span>
              <span>Режимы: {team.modes.join(', ')}</span>
              <span>Микрофон: {team.microphone_requirement}</span>
              <span>Время: {team.play_time || 'Гибко'}</span>
              <span>Цель: {team.goal}</span>
            </div>
            {team.description && <p className="about">{team.description}</p>}
            {selectedTeam?.id === team.id && (
              <div className="invite-box">
                <Textarea label="Комментарий к заявке" value={applicationMessage} onChange={setApplicationMessage} placeholder="Могу закрыть Controller, онлайн вечером." maxLength={500} />
                <Button onClick={() => apply(team)}>Отправить заявку</Button>
              </div>
            )}
            {reportTeam?.id === team.id && (
              <div className="invite-box">
                <Select label="Причина жалобы" value={reportReason} onChange={setReportReason} options={reportReasons} />
                <Textarea label="Комментарий" value={reportComment} onChange={setReportComment} placeholder="Коротко опиши проблему" maxLength={500} />
                <div className="row-actions">
                  <Button onClick={submitReport} variant="danger">Отправить жалобу</Button>
                  <Button onClick={() => setReportTeam(null)} variant="ghost">Отмена</Button>
                </div>
              </div>
            )}
            <div className="row-actions">
              <Button onClick={() => setSelectedTeam(selectedTeam?.id === team.id ? null : team)} variant="secondary">{selectedTeam?.id === team.id ? 'Свернуть' : 'Откликнуться'}</Button>
              <Button onClick={() => setReportTeam(reportTeam?.id === team.id ? null : team)} variant="ghost">Жалоба</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
