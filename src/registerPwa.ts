type RegisterSWModule = {
  registerSW: (options?: { immediate?: boolean }) => unknown
}

type RegisterPWAOptions = {
  isProd?: boolean
  serviceWorker?: ServiceWorkerContainer
  loadRegister?: () => Promise<RegisterSWModule>
}

export async function registerPWA(options: RegisterPWAOptions = {}) {
  const isProd = options.isProd ?? import.meta.env.PROD
  const serviceWorker = options.serviceWorker ?? (typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined)
  const loadRegister = options.loadRegister ?? (() => import('virtual:pwa-register'))

  if (!isProd || !serviceWorker) return false

  const { registerSW } = await loadRegister()
  registerSW({ immediate: true })

  return true
}
