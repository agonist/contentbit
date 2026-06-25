import type { LinkResolverOptions } from '@contentbit/core'

export interface LinkOptionValues {
  linkResolve?: string | boolean
  localeField?: string | boolean
  slugField?: string | boolean
  keyField?: string | boolean
  defaultLocale?: string | boolean
  'link-resolve'?: string | boolean
  'locale-field'?: string | boolean
  'slug-field'?: string | boolean
  'key-field'?: string | boolean
  'default-locale'?: string | boolean
}

export function linkResolverOptions(values: LinkOptionValues): LinkResolverOptions {
  const out: LinkResolverOptions = {}
  const resolve = stringValue(values.linkResolve ?? values['link-resolve'])
  if (resolve) {
    if (!isResolveMode(resolve)) throw new Error(`invalid --link-resolve ${resolve}`)
    out.resolve = resolve
  }
  const localeField = stringValue(values.localeField ?? values['locale-field'])
  const slugField = stringValue(values.slugField ?? values['slug-field'])
  const keyField = stringValue(values.keyField ?? values['key-field'])
  const defaultLocale = stringValue(values.defaultLocale ?? values['default-locale'])
  if (localeField) out.localeField = localeField
  if (slugField) out.slugField = slugField
  if (keyField) out.keyField = keyField
  if (defaultLocale) out.defaultLocale = defaultLocale
  return out
}

function stringValue(value: string | boolean | undefined): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function isResolveMode(value: string): value is NonNullable<LinkResolverOptions['resolve']> {
  return (
    value === 'global-slug' ||
    value === 'same-locale-slug' ||
    value === 'same-locale-key' ||
    value === 'prefer-same-locale-key-fallback-slug'
  )
}
