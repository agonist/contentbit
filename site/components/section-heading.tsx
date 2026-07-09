export function SectionHeading({
  index,
  eyebrow,
  title,
  body,
  align = 'left',
}: {
  index: string
  eyebrow: string
  title: string
  body?: string
  align?: 'left' | 'center'
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
        <span className="text-emerald-600 dark:text-emerald-400">{index}</span>
        <span className="mx-2 select-none">·</span>
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        {title}
      </h2>
      {body && (
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-base">{body}</p>
      )}
    </div>
  )
}
