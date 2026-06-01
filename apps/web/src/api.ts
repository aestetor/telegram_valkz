import { getInitData } from './telegram'
import type { Options, PlayerInvite, Profile, ProfilePayload, ReportPayload, Team, TeamApplication, TeamPayload } from './types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const initData = getInitData()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (initData) {
    headers.Authorization = `tma ${initData}`
  } else {
    headers['X-Debug-Telegram-Id'] = localStorage.getItem('debugTelegramId') || '1001'
    headers['X-Debug-Username'] = localStorage.getItem('debugUsername') || 'dev_user'
  }

  const response = await fetch(`${API_URL}/api${path}`, { ...options, headers })
  if (!response.ok) {
    let message = `Ошибка ${response.status}`
    try {
      const data = await response.json()
      message = data.detail || message
    } catch {
      // noop
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export const api = {
  options: () => request<Options>('/options'),
  getProfile: () => request<Profile | null>('/me/profile'),
  saveProfile: (payload: ProfilePayload) => request<Profile>('/me/profile', { method: 'PUT', body: JSON.stringify(payload) }),
  listProfiles: (params: URLSearchParams) => request<Profile[]>(`/profiles?${params.toString()}`),
  invitePlayer: (profileId: number, message: string) =>
    request<PlayerInvite>(`/profiles/${profileId}/invites`, { method: 'POST', body: JSON.stringify({ message }) }),
  listPlayerInvites: (direction: 'incoming' | 'outgoing') =>
    request<PlayerInvite[]>(`/me/player-invites?direction=${direction}`),
  respondPlayerInvite: (inviteId: number, action: 'accept' | 'reject' | 'cancel') =>
    request<PlayerInvite>(`/player-invites/${inviteId}/${action}`, { method: 'POST' }),
  listTeams: (params: URLSearchParams) => request<Team[]>(`/teams?${params.toString()}`),
  createTeam: (payload: TeamPayload) => request<Team>('/teams', { method: 'POST', body: JSON.stringify(payload) }),
  updateTeam: (teamId: number, payload: TeamPayload & { status: string }) =>
    request<Team>(`/teams/${teamId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getMyTeam: () => request<Team | null>('/me/team'),
  applyToTeam: (teamId: number, message: string) =>
    request<TeamApplication>(`/teams/${teamId}/apply`, { method: 'POST', body: JSON.stringify({ message }) }),
  listTeamApplications: () => request<TeamApplication[]>('/me/team-applications'),
  respondTeamApplication: (applicationId: number, action: 'accept' | 'reject' | 'cancel') =>
    request<TeamApplication>(`/team-applications/${applicationId}/${action}`, { method: 'POST' }),
  report: (payload: ReportPayload) =>
    request<{ status: string }>('/reports', { method: 'POST', body: JSON.stringify(payload) }),
}
