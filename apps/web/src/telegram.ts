declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string
        ready: () => void
        expand: () => void
        close: () => void
        MainButton?: {
          text: string
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
      }
    }
  }
}

export function initTelegram(): void {
  const webApp = window.Telegram?.WebApp
  webApp?.ready()
  webApp?.expand()
}

export function getInitData(): string {
  return window.Telegram?.WebApp?.initData || ''
}
