/** A URL path the site serves: starts with '/', percent-decoded, no query or hash. Directory index pages end in '/'. */
export type PagePath = string & { readonly __brand: 'PagePath' }

/** Parses a URL path into a page path. Throws a TypeError on a value without a leading '/'. */
export function pagePath(value: string): PagePath {
  const path = value.replace(/[?#].*$/s, '')
  if (!path.startsWith('/')) {
    throw new TypeError(`A page path starts with '/': ${JSON.stringify(value)}`)
  }
  return path.split('/').map(decodeSegment).join('/') as PagePath
}

/** 'index.html' -> '/', 'blog/x/index.html' -> '/blog/x/', 'about.html' -> '/about'. Accepts posix or Windows separators. */
export function pagePathFromFile(relativeFile: string): PagePath {
  const file = relativeFile.replaceAll('\\', '/').replace(/^\.?\//, '')
  if (file === 'index.html' || file.endsWith('/index.html')) {
    return `/${file.slice(0, -'index.html'.length)}` as PagePath
  }
  return `/${file.replace(/\.html$/, '')}` as PagePath
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

export type Landmark = 'header' | 'nav' | 'main' | 'aside' | 'footer'

/**
 * Where an element sits, so findings can be grouped into template findings.
 * selector: the tag plus its classes in document order, e.g. 'a.content-toc-link'.
 * landmark: the nearest landmark ancestor element, by tag or by its ARIA role.
 */
export interface ElementContext {
  selector: string
  landmark?: Landmark
}

export interface RenderedLink extends ElementContext {
  href: string
  rel?: string
}

/** alt undefined = no alt attribute; '' = decorative image. */
export interface RenderedImage extends ElementContext {
  src?: string
  alt?: string
}

export interface RenderedHeading {
  level: 1 | 2 | 3 | 4 | 5 | 6
  text: string
  id?: string
}

export interface HreflangAlternate {
  hreflang: string
  href: string
}

export type StructuredDataBlock = { valid: true; types: string[] } | { valid: false; error: string }

/** What a built page says about itself, read from its HTML. */
export interface RenderedPageFacts {
  /** <html lang> */
  lang?: string
  /** The first <title> outside <svg>, trimmed, whitespace collapsed. */
  title?: string
  /** <meta name="description" content>, trimmed, whitespace collapsed. */
  description?: string
  /** The first <link rel="canonical" href>. */
  canonical?: string
  /** From <meta name="robots"> and <meta name="googlebot">. */
  robots: { noindex: boolean; nofollow: boolean }
  /** The target of <meta http-equiv="refresh" content="0;url=...">. */
  redirect?: string
  /** Each <link rel="alternate" hreflang href>. */
  alternates: HreflangAlternate[]
  /** Each <script type="application/ld+json">. types: every @type in the block, first occurrence first. */
  structuredData: StructuredDataBlock[]
  /** h1-h6 in document order. text: the decoded visible text. */
  headings: RenderedHeading[]
  /** Every id attribute on the page, in order, deduplicated. */
  ids: string[]
  /** Every <a href>. */
  links: RenderedLink[]
  /** Every <img>. */
  images: RenderedImage[]
  /** Characters of visible text outside <head>, excluding script, style, template and noscript, whitespace collapsed. */
  textLength: number
}

/** One URL the site serves, as the HTML a reader or crawler receives for it. */
export interface BuiltPage {
  path: PagePath
  /** Posix path relative to the build root. */
  file: string
  facts: RenderedPageFacts
}

export interface Redirect {
  from: string
  to: string
  status: number
}

export interface BuiltSite {
  root: string
  /** Sorted by path. */
  pages: BuiltPage[]
  /** Absent when the build has no sitemap. files: posix paths relative to the root, in the order read. */
  sitemap?: { files: string[]; urls: string[] }
  /** Absent when the build has no robots.txt. */
  robots?: { sitemaps: string[]; disallow: string[] }
  /** From _redirects (Cloudflare Pages and Netlify format); [] when absent. */
  redirects: Redirect[]
}
