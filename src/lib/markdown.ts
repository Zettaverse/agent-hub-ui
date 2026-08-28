import { marked } from 'marked'

export function renderMarkdown(src: string): string {
  return marked.parse(src, { async: false }) as string
}
