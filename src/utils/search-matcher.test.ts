import { describe, expect, it } from 'vitest'

import { compileStringMatcher } from './search-matcher'

describe('shared frontend search matcher', () => {
  it.each([
    ['', {}, 'anything', true],
    ['Tokyo', {}, 'tokyo 02', true],
    ['Tokyo', { matchCase: true }, 'tokyo 02', false],
    ['Tokyo', { matchWholeWord: true }, 'Tokyo 02', true],
    ['Tokyo', { matchWholeWord: true }, 'TokyoEast', false],
    ['example.com', {}, 'exampleXcom', false],
    ['a+b', { matchWholeWord: true }, 'a+b', true],
    [
      '^(Tokyo|Hong Kong) \\d+$',
      { useRegularExpression: true },
      'Tokyo 02',
      true,
    ],
    [
      '^Tokyo$',
      { useRegularExpression: true, matchCase: true },
      'tokyo',
      false,
    ],
    ['演示', {}, '日常订阅 · 演示', true],
  ])('matches %j with %j against %j', (query, options, content, matches) => {
    const result = compileStringMatcher(query, options)
    expect(result.isValid).toBe(true)
    expect(result.matcher(content)).toBe(matches)
  })

  it('invalid regex fails safely and a corrected query recovers', () => {
    const invalid = compileStringMatcher('[', { useRegularExpression: true })
    expect(invalid.isValid).toBe(false)
    expect(invalid.matcher('anything')).toBe(false)
    const valid = compileStringMatcher('docs\\.example', {
      useRegularExpression: true,
    })
    expect(valid.isValid).toBe(true)
    expect(valid.matcher('docs.example.com')).toBe(true)
    expect(valid.matcher('docs.example.com')).toBe(true)
  })
})
