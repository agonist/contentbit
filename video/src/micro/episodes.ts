export const MICRO_EPISODE_IDS = [
  'ControlLayer',
  'BriefBeforeDraft',
  'DoctorRepair',
  'LinkGraph',
  'AdoptDryRun',
  'OneContract',
] as const

export type MicroEpisodeId = (typeof MICRO_EPISODE_IDS)[number]

export type MicroEpisode = {
  id: MicroEpisodeId
  index: string
  eyebrow: string
  hook: string
  accent: string
  payoff: string
  durationInFrames: number
}

export const MICRO_EPISODES: Record<MicroEpisodeId, MicroEpisode> = {
  ControlLayer: {
    id: 'ControlLayer',
    index: '01',
    eyebrow: 'THE BORING PART',
    hook: 'The agent wrote 100 pages.',
    accent: 'Then you get to review them.',
    payoff: 'Contentbit checks every page against the plan.',
    durationInFrames: 330,
  },
  BriefBeforeDraft: {
    id: 'BriefBeforeDraft',
    index: '02',
    eyebrow: 'BEFORE THE FILE EXISTS',
    hook: 'Brief the page',
    accent: 'before the agent writes.',
    payoff: 'A prompt asks. A contract defines done.',
    durationInFrames: 330,
  },
  DoctorRepair: {
    id: 'DoctorRepair',
    index: '03',
    eyebrow: 'CONTENT QA, IN CI',
    hook: 'It looks right.',
    accent: 'It is structurally wrong.',
    payoff: 'Precise errors. Automatic repair. Clean publish.',
    durationInFrames: 330,
  },
  LinkGraph: {
    id: 'LinkGraph',
    index: '04',
    eyebrow: 'THE GRAPH IS REAL',
    hook: 'Rename one page.',
    accent: 'Do not ship four broken links.',
    payoff: 'Broken internal links should fail CI.',
    durationInFrames: 330,
  },
  AdoptDryRun: {
    id: 'AdoptDryRun',
    index: '05',
    eyebrow: 'ADOPT WITHOUT MIGRATING',
    hook: 'Scan everything.',
    accent: 'Touch nothing.',
    payoff: 'Understand the library before changing it.',
    durationInFrames: 330,
  },
  OneContract: {
    id: 'OneContract',
    index: '06',
    eyebrow: 'ONE SOURCE OF TRUTH',
    hook: 'Four workflows.',
    accent: 'One content contract.',
    payoff: 'The control layer for programmatic SEO.',
    durationInFrames: 330,
  },
}
