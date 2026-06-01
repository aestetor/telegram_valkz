export type User = {
  id: number
  telegram_id: number
  username?: string | null
  first_name?: string | null
  last_name?: string | null
}

export type SearchStatus = 'actively_looking' | 'open_to_invites' | 'not_looking'

export const searchStatusLabels: Record<SearchStatus, string> = {
  actively_looking: 'Активно ищу',
  open_to_invites: 'Открыт к инвайтам',
  not_looking: 'Не ищу',
}

export const searchStatusOptions = Object.keys(searchStatusLabels) as SearchStatus[]

export function normalizeSearchStatus(value?: string | null): SearchStatus {
  return searchStatusOptions.includes(value as SearchStatus) ? (value as SearchStatus) : 'open_to_invites'
}

export type Profile = {
  id: number
  user_id: number
  user?: User | null
  valorant_nickname: string
  riot_id: string
  rank: string
  roles: string[]
  city: string
  age_range?: string | null
  microphone: string
  favorite_modes: string[]
  goals: string[]
  about?: string | null
  is_visible: boolean
  status: string
  search_status: SearchStatus
  completion_percent?: number | null
  created_at: string
  updated_at: string
}

export type ProfilePayload = {
  valorant_nickname: string
  riot_id: string
  rank: string
  roles: string[]
  city: string
  age_range?: string | null
  microphone: string
  favorite_modes: string[]
  goals: string[]
  about?: string | null
  is_visible: boolean
  search_status: SearchStatus
}

export type ReportPayload = {
  reported_user_id?: number | null
  team_id?: number | null
  reason: string
  comment?: string | null
}

export type Team = {
  id: number
  captain_id: number
  captain?: User | null
  name: string
  description?: string | null
  rank_range: string
  needed_roles: string[]
  city?: string | null
  format: string
  modes: string[]
  current_players_count: number
  needed_players_count: number
  microphone_requirement: string
  play_time?: string | null
  goal: string
  status: string
  is_visible: boolean
  created_at: string
  updated_at: string
}

export type TeamPayload = {
  name: string
  description?: string | null
  rank_range: string
  needed_roles: string[]
  city?: string | null
  format: string
  modes: string[]
  current_players_count: number
  needed_players_count: number
  microphone_requirement: string
  play_time?: string | null
  goal: string
  is_visible: boolean
}

export type TeamApplication = {
  id: number
  team_id: number
  user_id: number
  message?: string | null
  status: string
  team?: Team | null
  profile?: Profile | null
  created_at: string
  updated_at: string
}

export type PlayerInvite = {
  id: number
  from_user_id: number
  to_user_id: number
  message?: string | null
  status: string
  from_profile?: Profile | null
  to_profile?: Profile | null
  created_at: string
  updated_at: string
  expires_at?: string | null
}

export type Options = {
  ranks: string[]
  roles: string[]
  microphone_values: string[]
  favorite_modes: string[]
  goals: string[]
  age_ranges: string[]
  play_times: string[]
  team_goals: string[]
  team_formats: string[]
  microphone_requirements: string[]
  search_statuses?: SearchStatus[]
  report_reasons?: string[]
}
