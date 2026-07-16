import { Composition } from 'remotion'
import { Launch, LaunchRave, RAVE_DURATION } from './Launch'
import { MicroVideo } from './micro/MicroVideo'
import { MICRO_EPISODE_IDS, MICRO_EPISODES } from './micro/episodes'

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
      {MICRO_EPISODE_IDS.map((episodeId) => (
        <Composition
          key={episodeId}
          id={`Micro${episodeId}`}
          component={MicroVideo}
          durationInFrames={MICRO_EPISODES[episodeId].durationInFrames}
          fps={30}
          width={1080}
          height={1350}
          defaultProps={{ episodeId }}
        />
      ))}
    </>
  )
}
