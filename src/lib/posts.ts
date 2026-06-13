import { marked } from 'marked'

export interface Post {
  slug: string
  title: string
  description: string
  date: string
  tags: string[]
  html: string
}

// content/blog/*.md をビルド時に読み込み（クライアント・SSR両対応）
const modules = import.meta.glob('../../content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function parseFrontmatter(raw: string): { data: Record<string, string | string[]>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!match) return { data: {}, body: raw }
  const [, fm, body] = match
  const data: Record<string, string | string[]> = {}
  for (const line of fm.split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const rawVal = line.slice(idx + 1).trim()
    if (key === 'tags') {
      data.tags = rawVal.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean)
    } else {
      data[key] = rawVal.replace(/^["']|["']$/g, '')
    }
  }
  return { data, body }
}

function slugFromPath(path: string): string {
  return path.split('/').pop()!.replace(/\.md$/, '')
}

export const posts: Post[] = Object.entries(modules)
  .map(([path, raw]) => {
    const { data, body } = parseFrontmatter(raw)
    return {
      slug: slugFromPath(path),
      title: (data.title as string) ?? '',
      description: (data.description as string) ?? '',
      date: (data.date as string) ?? '',
      tags: (data.tags as string[]) ?? [],
      html: marked.parse(body, { async: false }) as string,
    }
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1))

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug)
}
