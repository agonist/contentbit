import type { IncomingMessage, ServerResponse } from 'node:http'

import { scanDocument, scanGraph, scanProject } from './scan.js'
import type { StudioOptions } from './types.js'

export async function handleStudioApiRequest(
  options: StudioOptions,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  if (!req.url) return false
  const url = new URL(req.url, 'http://contentbit.local')
  if (!url.pathname.startsWith('/api/')) return false

  try {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Studio API is read-only.' })
      return true
    }

    if (url.pathname === '/api/project') {
      sendJson(res, 200, await scanProject(options))
      return true
    }

    if (url.pathname === '/api/graph') {
      sendJson(res, 200, await scanGraph(options))
      return true
    }

    if (url.pathname === '/api/document') {
      const path = url.searchParams.get('path')
      if (!path) {
        sendJson(res, 400, { error: 'Missing ?path=' })
        return true
      }
      const document = await scanDocument(options, path)
      if (!document) {
        sendJson(res, 404, { error: 'Document is not in the configured content set.' })
        return true
      }
      sendJson(res, 200, document)
      return true
    }

    sendJson(res, 404, { error: 'Unknown Studio API route.' })
    return true
  } catch (err) {
    sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) })
    return true
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body, null, 2))
}
