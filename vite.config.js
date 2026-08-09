import fs from 'node:fs/promises'
import path from 'node:path'
import { defineConfig } from 'vite'

const endpoint = '/__snake-debug/events'
const debugRunsDirectory = '.debug-runs'
const maxBodyBytes = 1024 * 1024

function sanitizeDebugSessionId(sessionId) {
  return sessionId.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 180)
}

function debugRunOutputPath(root, sessionId) {
  const outputDirectory = path.resolve(root, debugRunsDirectory)
  const safeSessionId = sanitizeDebugSessionId(sessionId) || 'debug-session'
  const outputPath = path.resolve(outputDirectory, `${safeSessionId}.jsonl`)
  if (!outputPath.startsWith(`${outputDirectory}${path.sep}`)) {
    throw new Error('Invalid debug output path.')
  }
  return { outputDirectory, outputPath }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    let byteLength = 0
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      byteLength += Buffer.byteLength(chunk, 'utf8')
      if (byteLength > maxBodyBytes) {
        reject(Object.assign(new Error('Debug request body is too large.'), { statusCode: 413 }))
        req.destroy()
        return
      }
      body += chunk
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function snakeDebugPlugin() {
  return {
    name: 'snake-debug-jsonl',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(endpoint, async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method not allowed')
          return
        }
        try {
          const body = await readRequestBody(req)
          const parsed = JSON.parse(body)
          if (!parsed || typeof parsed.sessionId !== 'string' || parsed.sessionId.length === 0) {
            res.statusCode = 400
            res.end('Missing sessionId')
            return
          }
          if (!Array.isArray(parsed.events)) {
            res.statusCode = 400
            res.end('Missing events array')
            return
          }
          const { outputDirectory, outputPath } = debugRunOutputPath(
            server.config.root,
            parsed.sessionId,
          )
          await fs.mkdir(outputDirectory, { recursive: true })
          const jsonl = parsed.events.map((event) => JSON.stringify(event)).join('\n')
          if (jsonl.length > 0) {
            await fs.appendFile(outputPath, `${jsonl}\n`, 'utf8')
          }
          res.statusCode = 204
          res.end()
        } catch (error) {
          server.config.logger.error(
            `[snake-debug] ${error instanceof Error ? error.message : String(error)}`,
          )
          res.statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 400
          res.end('Invalid debug request')
        }
      })
    },
  }
}

export default defineConfig({
  // ... other config
  base: "/snake-for-the-modern-gamer/",
  plugins: [snakeDebugPlugin()],
})
