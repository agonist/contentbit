import { ArrowRight, Check } from 'lucide-react'

function Chip({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`bg-background inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs shadow-sm ${className}`}
    >
      {children}
    </span>
  )
}

function CellHeading({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{body}</p>
    </div>
  )
}

/** Inset figure panel: separates the visual from the caption below it. */
function Visual({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-muted/50 dark:bg-muted/30 flex-1 rounded-lg border p-4 ${className}`}>
      {children}
    </div>
  )
}

/** One source, three render targets — fan-out diagram. */
function LockInCell() {
  return (
    <div className="bg-card group flex flex-col gap-5 rounded-xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md lg:col-span-2">
      <Visual className="flex items-center justify-center gap-2 sm:gap-4">
        <Chip>guide.md</Chip>
        <svg viewBox="0 0 96 96" className="text-border h-24 w-16 shrink-0 sm:w-24" aria-hidden>
          <path
            className="fan-path"
            d="M0 48 C 40 48, 50 12, 96 12 M0 48 L96 48 M0 48 C 40 48, 50 84, 96 84"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
        <div className="flex flex-col gap-2.5">
          <Chip className="fan-chip [animation-delay:200ms]">
            <span className="text-sky-600 dark:text-sky-400">&lt;React /&gt;</span>
          </Chip>
          <Chip className="fan-chip [animation-delay:350ms]">
            <span className="text-amber-600 dark:text-amber-400">Astro</span>
          </Chip>
          <Chip className="fan-chip [animation-delay:500ms]">
            <span className="text-muted-foreground">plain .md</span>
          </Chip>
        </div>
      </Visual>
      <CellHeading
        title="No framework lock-in"
        body="The content is a protocol. Renderers are adapters: React and Astro today, plain Markdown always."
      />
    </div>
  )
}

/** Red diagnostic chip → green fix. */
function ValidationCell() {
  return (
    <div className="bg-card group flex flex-col gap-5 rounded-xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Visual className="space-y-2.5 font-mono text-xs">
        <pre className="overflow-x-auto">
          <code className="decoration-destructive text-muted-foreground underline decoration-wavy underline-offset-4">
            {'- Price | Free'}
          </code>
        </pre>
        <div className="replay text-destructive flex items-center gap-2 [animation-delay:100ms]">
          <span className="bg-destructive/10 rounded px-1.5 py-0.5 font-medium">
            CB_ROW_COLUMNS
          </span>
          <span>broken.md:2:1</span>
        </div>
        <pre className="replay overflow-x-auto [animation-delay:350ms]">
          <code>{'- Price | Free | $12/mo'}</code>
        </pre>
        <div className="replay flex items-center gap-1.5 text-emerald-600 [animation-delay:600ms] dark:text-emerald-400">
          <Check className="size-3.5" />
          <span>0 errors, 0 warnings</span>
        </div>
      </Visual>
      <CellHeading
        title="Validation before render"
        body="Every block has a schema. Bad content fails with file:line:col diagnostics, not broken pages."
      />
    </div>
  )
}

/** The generated authoring rules, as chips. */
function LlmCell() {
  return (
    <div className="bg-card group flex flex-col gap-5 rounded-xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Visual className="space-y-2">
        {[
          'write regular Markdown by default',
          'never invent block names',
          'fix diagnostics, don’t bypass them',
        ].map((rule, i) => (
          <div
            key={rule}
            className="text-muted-foreground flex items-center gap-2 font-mono text-xs"
          >
            <Check
              className="stamp size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              style={{ animationDelay: `${i * 150}ms` }}
            />
            {rule}
          </div>
        ))}
        <p className="text-muted-foreground/70 pt-1 font-mono text-[10px] tracking-widest uppercase">
          ↳ generated from the registry
        </p>
      </Visual>
      <CellHeading
        title="Made for LLM output"
        body="The registry that validates content also writes the authoring instructions for LLMs, so prompts never drift from the rules."
      />
    </div>
  )
}

/** Plain readable markdown. */
function MarkdownCell() {
  return (
    <div className="bg-card group flex flex-col gap-5 rounded-xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Visual>
        <pre className="text-muted-foreground overflow-x-auto font-mono text-xs leading-relaxed">
          <code>
            <span className="text-foreground font-medium">## Dough basics</span>
            {'\n\n'}
            Weigh everything. Volume
            {'\n'}
            measures drift by 20%.
            {'\n\n'}
            <span className="text-foreground font-medium">{':::callout{type="tip"}'}</span>
            {'\n'}
            Cold ferment for flavor.
            {'\n'}
            <span className="text-foreground caret font-medium">:::</span>
          </code>
        </pre>
      </Visual>
      <CellHeading
        title="Still just Markdown"
        body="Documents stay readable in any text editor. Strip the renderer and the content still makes sense."
      />
    </div>
  )
}

/** Install command + resulting file tree. */
function ShadcnCell() {
  return (
    <div className="bg-card group flex flex-col gap-5 rounded-xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Visual className="space-y-2.5 font-mono text-xs">
        <div className="text-muted-foreground">
          <span className="text-foreground/50 select-none">$ </span>
          shadcn add <span className="text-foreground">@contentbit/tabs</span>
        </div>
        <pre className="text-muted-foreground overflow-x-auto leading-relaxed">
          <code>
            {'components/\n└─ content-blocks/\n   └─ '}
            <span className="flash rounded px-0.5 text-emerald-600 dark:text-emerald-400">
              tabs-block.tsx
            </span>
            <span className="text-muted-foreground/70"> ← yours now</span>
          </code>
        </pre>
      </Visual>
      <CellHeading
        title="shadcn distribution"
        body="Styled components install as editable source files through a shadcn registry. You own them after install."
      />
    </div>
  )
}

/** Full-width: defineBlock in under 20 lines. */
function RegistryCell() {
  return (
    <div className="bg-card group grid items-center gap-5 rounded-xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md lg:col-span-3 lg:grid-cols-2">
      <pre className="bg-muted/50 dark:bg-muted/30 overflow-x-auto rounded-lg border p-4 font-mono text-xs leading-relaxed">
        <code>
          <span className="text-muted-foreground">{'const pricingTable = '}</span>
          <span className="text-foreground">defineBlock</span>
          <span className="text-muted-foreground">{'({'}</span>
          {'\n  name: '}
          <span className="text-emerald-600 dark:text-emerald-400">{"'pricing-table'"}</span>,
          {'\n  props: z.object({ currency: z.enum(['}
          <span className="text-emerald-600 dark:text-emerald-400">{"'usd'"}</span>,{' '}
          <span className="text-emerald-600 dark:text-emerald-400">{"'eur'"}</span>
          {']) }),\n  content: pipeRows({ columns: ['}
          <span className="text-emerald-600 dark:text-emerald-400">{"'plan'"}</span>,{' '}
          <span className="text-emerald-600 dark:text-emerald-400">{"'price'"}</span>
          {'] }),\n  authoring: { useWhen: [...], example },\n'}
          <span className="text-muted-foreground">{'})'}</span>
        </code>
      </pre>
      <div className="flex items-start gap-3">
        <ArrowRight className="text-muted-foreground mt-0.5 hidden size-4 shrink-0 lg:block" />
        <CellHeading
          title="Extensible registry"
          body="A custom block is a name, a zod props schema, a content model, and authoring guidance, in under 20 lines. It validates, renders, and documents itself from that one definition."
        />
      </div>
    </div>
  )
}

export function FeatureBento() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <LockInCell />
      <ValidationCell />
      <MarkdownCell />
      <LlmCell />
      <ShadcnCell />
      <RegistryCell />
    </div>
  )
}
