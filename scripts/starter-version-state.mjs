const CONTENTBIT_NAME = /^(?:contentbit|@contentbit\/)/

export function contentbitDependencyEntries(pkg) {
  const entries = []
  for (const field of ['dependencies', 'devDependencies']) {
    for (const [name, range] of Object.entries(pkg[field] ?? {})) {
      if (CONTENTBIT_NAME.test(name)) entries.push({ field, name, range })
    }
  }
  return entries
}

export function starterVersionIssues(pkg, lockfile) {
  const entries = contentbitDependencyEntries(pkg)
  if (entries.length === 0) return ['package.json has no Contentbit dependencies']

  const expectedRange = entries[0].range
  const version = /^\^(\d+\.\d+\.\d+)$/.exec(expectedRange)?.[1]
  const issues = []
  if (!version) issues.push(`${entries[0].field}.${entries[0].name} must use a ^x.y.z range`)

  const importer = lockfile.split(/^packages:/m, 1)[0]
  for (const entry of entries) {
    if (entry.range !== expectedRange) {
      issues.push(`${entry.field}.${entry.name} is ${entry.range}, expected ${expectedRange}`)
    }
    const locked = lockImporterEntry(importer, entry.name)
    if (!locked) {
      issues.push(`pnpm-lock.yaml is missing importer ${entry.name}`)
      continue
    }
    if (locked.specifier !== entry.range) {
      issues.push(
        `pnpm-lock.yaml ${entry.name} specifier is ${locked.specifier}, expected ${entry.range}`,
      )
    }
    if (version && locked.version !== version) {
      issues.push(`pnpm-lock.yaml ${entry.name} resolves ${locked.version}, expected ${version}`)
    }
  }
  return issues
}

export function syncStarterManifest(pkg, version) {
  const next = structuredClone(pkg)
  for (const { field, name } of contentbitDependencyEntries(next)) {
    next[field][name] = `^${version}`
  }
  return next
}

function lockImporterEntry(importer, name) {
  const key = name.startsWith('@') ? `'${escapeRegex(name)}'` : escapeRegex(name)
  const match = importer.match(
    new RegExp(`^ {6}${key}:\\n {8}specifier: (\\S+)\\n {8}version: (\\S+)`, 'm'),
  )
  if (!match) return undefined
  return { specifier: match[1], version: match[2].replace(/\(.*/, '') }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
