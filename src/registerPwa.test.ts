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
    const update = vi.fn().mockResolvedValue(undefined)

    await expect(registerPWA({
      isProd: true,
      serviceWorker: {
        ready: Promise.resolve({ update }),
      } as unknown as ServiceWorkerContainer,
      loadRegister,
    })).resolves.toBe(true)
    expect(loadRegister).toHaveBeenCalledTimes(1)
    expect(registerSW).toHaveBeenCalledWith({ immediate: true })
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('fails closed when the registration module cannot be loaded', async () => {
    const loadRegister = vi.fn().mockRejectedValue(new Error('network'))

    await expect(registerPWA({
      isProd: true,
      serviceWorker: {} as ServiceWorkerContainer,
      loadRegister,
    })).resolves.toBe(false)
  })

  it('fails closed when registerSW throws after loading', async () => {
    const loadRegister = vi.fn().mockResolvedValue({
      registerSW: vi.fn(() => {
        throw new Error('boom')
      }),
    })

    await expect(registerPWA({
      isProd: true,
      serviceWorker: {} as ServiceWorkerContainer,
      loadRegister,
    })).resolves.toBe(false)
  })
})
