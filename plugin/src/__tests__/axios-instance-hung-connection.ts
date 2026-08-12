import { createServer, Server } from "http"
import { AddressInfo, Socket } from "net"
import { createAxiosInstance } from "../axios-instance"

describe(`createAxiosInstance against a hung connection`, () => {
  let server: Server
  let baseUrl: string
  let connectionCount: number
  let sockets: Array<Socket>

  beforeAll((done) => {
    // Accepts the connection but never writes a response - simulating a
    // stalled TCP connection, a black-holed response, or a proxy silently
    // dropping the connection. No RST/FIN is ever sent, so without a client-side
    // timeout this request would never fail on its own.
    server = createServer((_req, _res) => {
      connectionCount += 1
      // Deliberately never call res.end() / res.write().
    })
    sockets = []
    server.on(`connection`, (socket) => sockets.push(socket))
    server.listen(0, () => {
      const address = server.address() as AddressInfo
      baseUrl = `http://127.0.0.1:${address.port}`
      done()
    })
  })

  afterAll((done) => {
    // A hung connection that's never responded to may still be open as far
    // as the server is concerned even after the client has given up (or,
    // against the pre-fix code with no timeout at all, forever) - destroy
    // sockets directly rather than relying on graceful close to avoid
    // hanging the test process on cleanup too.
    sockets.forEach((socket) => socket.destroy())
    server.close(done)
  })

  beforeEach(() => {
    connectionCount = 0
  })

  it(
    `fails fast on a short requestTimeout instead of hanging indefinitely`,
    async () => {
      const instance = createAxiosInstance({ apiURL: baseUrl, requestTimeout: 100 })

      const start = Date.now()
      await expect(instance.get(`/`)).rejects.toMatchObject({ code: `ECONNABORTED` })
      const elapsedMs = Date.now() - start

      // Comfortably bounded, and nowhere near the 18-minute external CI
      // timeout this is meant to make unnecessary as a backstop.
      expect(elapsedMs).toBeLessThan(2000)
      expect(connectionCount).toEqual(1)
    },
    10000
  )

  it(
    `retries a timed-out request instead of treating it as non-retryable`,
    async () => {
      // axios-retry's own isRetryableError explicitly excludes timeouts by
      // design - this asserts the plugin's override actually takes effect
      // against a real timeout, not just against a hand-built error object.
      const instance = createAxiosInstance({ apiURL: baseUrl, requestTimeout: 100, retries: 2 })

      await expect(instance.get(`/`)).rejects.toMatchObject({ code: `ECONNABORTED` })

      // One initial attempt plus two retries.
      expect(connectionCount).toEqual(3)
    },
    15000
  )
})
