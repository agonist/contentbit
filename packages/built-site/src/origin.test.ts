import { expect, test } from 'vitest'

import { httpOrigin, inferOrigin, pagePath, type BuiltSite } from './index.js'

test('httpOrigin keeps the scheme and host of an absolute http or https URL', () => {
  expect(httpOrigin('https://example.com')).toBe('https://example.com')
  expect(httpOrigin('https://Example.com/blog/post/?ref=a#top')).toBe('https://example.com')
  expect(httpOrigin('http://localhost:4321/')).toBe('http://localhost:4321')
})

test('httpOrigin rejects relative URLs and other schemes', () => {
  expect(httpOrigin('example.com')).toBeUndefined()
  expect(httpOrigin('/blog/')).toBeUndefined()
  expect(httpOrigin('//example.com/')).toBeUndefined()
  expect(httpOrigin('ftp://example.com/')).toBeUndefined()
  expect(httpOrigin('')).toBeUndefined()
})

function siteWithCanonicals(canonicals: Array<string | undefined>): BuiltSite {
  return {
    root: '/site/dist',
    pages: canonicals.map((canonical, index) => ({
      path: pagePath(`/page-${index}/`),
      file: `page-${index}/index.html`,
      facts: {
        canonical,
        robots: { noindex: false, nofollow: false },
        alternates: [],
        structuredData: [],
        headings: [],
        ids: [],
        links: [],
        images: [],
        textLength: 0,
      },
    })),
    redirects: [],
  }
}

test('inferOrigin takes the most common origin among absolute canonicals', () => {
  const site = siteWithCanonicals([
    'https://staging.example/a/',
    'https://www.example.com/b/',
    '/relative/',
    'https://www.example.com/c/',
    undefined,
  ])
  expect(inferOrigin(site)).toBe('https://www.example.com')
})

test('inferOrigin breaks a tie with the first origin in page order', () => {
  const site = siteWithCanonicals([
    'https://second.example/',
    'https://first.example/',
    'https://first.example/x/',
    'https://second.example/y/',
  ])
  expect(inferOrigin(site)).toBe('https://second.example')
})

test('inferOrigin has no answer without an absolute canonical', () => {
  const site = siteWithCanonicals(['/a/', undefined, 'mailto:hi@example.com'])
  expect(inferOrigin(site)).toBeUndefined()
  expect(inferOrigin(siteWithCanonicals([]))).toBeUndefined()
})
