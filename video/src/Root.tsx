import { Composition } from 'remotion'
import { Launch, LaunchRave, RAVE_DURATION } from './Launch'

export function Root() {
  return (
    <>
      <Composition
        id="Launch"
        component={Launch}
        durationInFrames={790}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="LaunchRave"
        component={LaunchRave}
        durationInFrames={RAVE_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  )
}
