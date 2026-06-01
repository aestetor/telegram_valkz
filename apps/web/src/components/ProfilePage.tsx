import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { Options, Profile, ProfilePayload, SearchStatus } from '../types'
import { normalizeSearchStatus, searchStatusLabels, searchStatusOptions } from '../types'
import { Button, Card, Input, MultiSelect, Select, Textarea } from './ui'

const emptyProfile: ProfilePayload = {
  valorant_nickname: '',
  riot_id: '',
  rank: '',
  roles: [],
  city: '',
  age_range: null,
  microphone: '',
  favorite_modes: [],
  goals: [],
  about: '',
  is_visible: true,
  search_status: 'open_to_invites',
}

const requiredFields: (keyof ProfilePayload)[] = [
  'valorant_nickname',
  'riot_id',
  'rank',
  'roles',
  'city',
  'microphone',
  'favorite_modes',
  'goals',
]

function toPayload(profile: Profile | null): ProfilePayload {
  if (!profile) return emptyProfile
  return {
    valorant_nickname: profile.valorant_nickname,
    riot_id: profile.riot_id,
    rank: profile.rank,
    roles: profile.roles,
    city: profile.city,
    age_range: profile.age_range,
    microphone: profile.microphone,
    favorite_modes: profile.favorite_modes,
    goals: profile.goals,
    about: profile.about || '',
    is_visible: profile.is_visible,
    search_status: normalizeSearchStatus(profile.search_status),
  }
}

function completion(payload: ProfilePayload): number {
  const filled = requiredFields.filter((field) => {
    const value = payload[field]
    return Array.isArray(value) ? value.length > 0 : Boolean(value)
  }).length
  return Math.round((filled / requiredFields.length) * 100)
}

export default function ProfilePage({ options, initialProfile, onSaved }: {
  options: Options
  initialProfile: Profile | null
  onSaved: (profile: Profile) => void
}) {
  const [form, setForm] = useState<ProfilePayload>(toPayload(initialProfile))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const percent = useMemo(() => completion(form), [form])

  useEffect(() => {
    setForm(toPayload(initialProfile))
  }, [initialProfile])

  function update<K extends keyof ProfilePayload>(key: K, value: ProfilePayload[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    setError('')
    if (!form.riot_id.includes('#')) {
      setError('Riot ID должен быть в формате Nick#Tag')
      return
    }
    setSaving(true)
    try {
      const saved = await api.saveProfile({ ...form, search_status: normalizeSearchStatus(form.search_status) })
      onSaved(saved)
    } catch (event) {
      setError(event instanceof Error ? event.message : 'Не удалось сохранить анкету')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-stack">
      <Card>
        <div className="section-head">
          <div>
            <p className="eyebrow">Анкета</p>
            <h2>Моя анкета</h2>
          </div>
          <div className="progress-ring">{percent}%</div>
        </div>
        <div className="progress"><div style={{ width: `${percent}%` }} /></div>
        <p className="muted">Заполни обязательные поля, чтобы появиться в поиске игроков и команд.</p>
      </Card>

      <Card>
        <div className="form-grid">
          <Input label="Ник в Valorant" value={form.valorant_nickname} onChange={(value) => update('valorant_nickname', value)} placeholder="ShadowPeek" />
          <Input label="Riot ID" value={form.riot_id} onChange={(value) => update('riot_id', value)} placeholder="Shadow#777" />
          <Select label="Ранг" value={form.rank} onChange={(value) => update('rank', value)} options={options.ranks} />
          <Input label="Город" value={form.city} onChange={(value) => update('city', value)} placeholder="Алматы" />
          <Select label="Возраст" value={form.age_range || ''} onChange={(value) => update('age_range', value || null)} options={options.age_ranges} placeholder="Не указывать" />
          <Select label="Микрофон" value={form.microphone} onChange={(value) => update('microphone', value)} options={options.microphone_values} />
        </div>
        <MultiSelect label="Роль" values={form.roles} onChange={(values) => update('roles', values)} options={options.roles} />
        <MultiSelect label="Любимый режим" values={form.favorite_modes} onChange={(values) => update('favorite_modes', values)} options={options.favorite_modes} />
        <MultiSelect label="Цель" values={form.goals} onChange={(values) => update('goals', values)} options={options.goals} />
        <Textarea label="О себе" value={form.about || ''} onChange={(value) => update('about', value)} placeholder="Играю вечером, не токсик, люблю ranked." maxLength={300} />

        <label className="switch-row">
          <span>Показывать меня в поиске</span>
          <input type="checkbox" checked={form.is_visible} onChange={(event) => update('is_visible', event.target.checked)} />
        </label>
        <label className="field">
          <span>Статус поиска</span>
          <select value={form.search_status} onChange={(event) => update('search_status', event.target.value as SearchStatus)}>
            {searchStatusOptions.map((value) => (
              <option key={value} value={value}>{searchStatusLabels[value]}</option>
            ))}
          </select>
        </label>
        {error && <p className="error">{error}</p>}
        <Button onClick={save} disabled={saving}>{saving ? 'Сохраняю...' : 'Сохранить анкету'}</Button>
      </Card>

      <Card>
        <p className="eyebrow">Preview</p>
        <h3>{form.valorant_nickname || 'Твой ник'}</h3>
        <p className="muted">{form.riot_id || 'Nick#Tag'}</p>
        <div className="profile-status">
          <span>{form.is_visible ? 'Виден в поиске' : 'Скрыт'}</span>
          <span>{searchStatusLabels[normalizeSearchStatus(form.search_status)]}</span>
        </div>
        <div className="mini-grid">
          <span>Ранг: {form.rank || 'не указан'}</span>
          <span>Роль: {form.roles.join(' / ') || 'не указана'}</span>
          <span>Город: {form.city || 'не указан'}</span>
          <span>Микрофон: {form.microphone || 'не указан'}</span>
          <span>Режим: {form.favorite_modes.join(', ') || 'не указан'}</span>
          <span>Цель: {form.goals.join(', ') || 'не указана'}</span>
        </div>
        {form.about && <p className="about">{form.about}</p>}
      </Card>
    </div>
  )
}
