import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { loadFont } from '@remotion/google-fonts/GeistMono'
import { Command } from './scenes/Command'
import { End } from './scenes/End'
import { Loop } from './scenes/Loop'
import { Payoff } from './scenes/Payoff'
import { Problem } from './scenes/Problem'
import { Rave } from './scenes/Rave'
import { C } from './lib/theme'

loadFont('normal', { weights: ['400', '700'], subsets: ['latin'] })

/** Quick crossfade wrapper: fades a scene out over its last 8 frames. */
function FadeOut({ duration, children }: { duration: number; children: React.ReactNode }) {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [duration - 8, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
}

export function Launch() {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Each scene's action completes ~60% in; the rest is hold time. */}
      <Sequence durationInFrames={185}>
        <FadeOut duration={185}>
          <Problem />
        </FadeOut>
      </Sequence>
      <Sequence from={185} durationInFrames={145}>
        <FadeOut duration={145}>
          <Command />
        </FadeOut>
      </Sequence>
      <Sequence from={330} durationInFrames={215}>
        <FadeOut duration={215}>
          <Loop />
        </FadeOut>
      </Sequence>
      <Sequence from={545} durationInFrames={155}>
        <FadeOut duration={155}>
          <Payoff />
        </FadeOut>
      </Sequence>
      <Sequence from={700} durationInFrames={90}>
        <End />
      </Sequence>
    </AbsoluteFill>
  )
}

/*
 * The rave cut: identical 26s of information, then the end card holds and
 * goes wild with the music until the track runs out. Drop the track at
 * video/public/track.mp3 and set TRACK below.
 */
// The track's beat drops at 0:17 and starts at frame 0 — no silent lead-in.
// The rave cut's intro is tightened so the wordmark lands exactly on the
// drop: frame 510 = 17s. The sober Launch cut keeps its relaxed pacing.
export const RAVE_DURATION = 6079 // 3:22.66 at 30fps

const TRACK: string | null = 'track.mp3'

export function LaunchRave() {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {TRACK ? (
        <Audio
          src={staticFile(TRACK)}
          volume={(f) =>
            interpolate(f, [0, 60], [0.55, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      ) : null}
      <Sequence durationInFrames={135}>
        <FadeOut duration={135}>
          <Problem />
        </FadeOut>
      </Sequence>
      <Sequence from={135} durationInFrames={105}>
        <FadeOut duration={105}>
          <Command />
        </FadeOut>
      </Sequence>
      <Sequence from={240} durationInFrames={160}>
        <FadeOut duration={160}>
          <Loop />
        </FadeOut>
      </Sequence>
      <Sequence from={400} durationInFrames={110}>
        <FadeOut duration={110}>
          <Payoff />
        </FadeOut>
      </Sequence>
      {/* No assembly, no fade: the full card slams in on the drop. */}
      <Sequence from={510} durationInFrames={RAVE_DURATION - 510}>
        <Rave />
      </Sequence>
    </AbsoluteFill>
  )
}
