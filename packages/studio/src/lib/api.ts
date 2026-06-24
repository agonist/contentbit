import type { StudioDocument, StudioGraph, StudioProject } from '../server/types'

export async function fetchProject(): Promise<StudioProject> {
  return json<StudioProject>('/api/project')
}

export async function fetchGraph(): Promise<StudioGraph> {
  return json<StudioGraph>('/api/graph')
}

export async function fetchDocument(path: string): Promise<StudioDocument> {
  return json<StudioDocument>(`/api/document?path=${encodeURIComponent(path)}`)
}

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Request failed: ${res.status}`)
  }
  return (await res.json()) as T
}
