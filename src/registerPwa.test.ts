import { registerPWA } from './registerPwa'

describe('registerPWA', () => {
  it('skips registration outside production', async () => {
    const loadRegister = vi.fn()

    await expect(registerPWA({
      isProd: false,
      serviceWorker: {} as ServiceWorkerContainer,
      loadRegister,
    })).resolves.toBe(false)
    expect(loadRegister).not.toHaveBeenCalled()
  })

  it('skips registration when service workers are unavailable', async () => {
    const loadRegister = vi.fn()

    await expect(registerPWA({
      isProd: true,
      loadRegister,
    })).resolves.toBe(false)
    expect(loadRegister).not.toHaveBeenCalled()
  })

  it('registers the generated service worker immediately in production', async () => {
    const registerSW = vi.fn()
    const loadRegister = vi.fn().mockResolvedValue({ registerSW })

    await expect(registerPWA({
      isProd: true,
      serviceWorker: {} as ServiceWorkerContainer,
      loadRegister,
    })).resolves.toBe(true)
    expect(loadRegister).toHaveBeenCalledTimes(1)
    expect(registerSW).toHaveBeenCalledWith({ immediate: true })
  })
})
