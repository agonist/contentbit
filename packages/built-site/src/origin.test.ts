import { expect, test } from 'vitest'

import { httpOrigin } from './index.js'

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
