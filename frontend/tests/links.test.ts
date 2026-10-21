import { describe, expect, it } from 'vitest'
import { externalLink } from '../services/links'

describe('external links', () => {
  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    'file:///etc/passwd',
    'https://user:pass@example.com',
    'java\nscript:alert(1)',
    'mynotes:page'
  ])('rejects unsafe external URL %s', (url) => {
    expect(externalLink(url)).toBeNull()
  })
  it.each([
    'https://example.com/path?q=test',
    'http://localhost:5173/',
    'mailto:hello@example.com'
  ])('allows supported URL %s', (url) => {
    expect(externalLink(url)).toBe(url)
  })
})
