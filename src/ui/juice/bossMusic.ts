export type BossMusicResult = {
  sources: OscillatorNode[];
  cleanup: AudioNode[];
  onBuild?: (gain: GainNode) => void;
};

type BossMusicBuilder = (now: number, gain: GainNode) => BossMusicResult | undefined;

type BossMusicDefinition = {
  build: BossMusicBuilder;
};

const BOSS_MUSIC_REGISTRY: Record<string, BossMusicDefinition> = {
  'jason-statham': {
    build(now: number, gain: GainNode): BossMusicResult {
      const sources: OscillatorNode[] = [];
      const cleanup: AudioNode[] = [];

      const bass = gain.context.createGain();
      bass.gain.value = 0.55;
      const bassOsc = gain.context.createOscillator();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.value = 82;
      bassOsc.connect(bass);
      bass.connect(gain);
      sources.push(bassOsc);
      cleanup.push(bass);

      const mid = gain.context.createGain();
      mid.gain.value = 0.2;
      const midOsc1 = gain.context.createOscillator();
      midOsc1.type = 'sawtooth';
      midOsc1.frequency.value = 82.5;
      midOsc1.connect(mid);
      const midOsc2 = gain.context.createOscillator();
      midOsc2.type = 'square';
      midOsc2.frequency.value = 81.8;
      midOsc2.connect(mid);
      mid.connect(gain);
      sources.push(midOsc1, midOsc2);
      cleanup.push(mid);

      const sub = gain.context.createGain();
      sub.gain.value = 0.35;
      const subOsc = gain.context.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.value = 41;
      subOsc.connect(sub);
      sub.connect(gain);
      sources.push(subOsc);
      cleanup.push(sub);

      const lead = gain.context.createGain();
      lead.gain.value = 0.12;
      const leadOsc = gain.context.createOscillator();
      leadOsc.type = 'triangle';
      leadOsc.frequency.value = 330;
      leadOsc.connect(lead);
      lead.connect(gain);
      sources.push(leadOsc);
      cleanup.push(lead);

      const lfo = gain.context.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 1.8;
      const lfoGain = gain.context.createGain();
      lfoGain.gain.value = 6;
      lfo.connect(lfoGain);
      lfoGain.connect(bassOsc.frequency);
      lfoGain.connect(midOsc1.frequency);
      sources.push(lfo);
      cleanup.push(lfoGain);

      const rhythmLfo = gain.context.createOscillator();
      rhythmLfo.type = 'sawtooth';
      rhythmLfo.frequency.value = 3.5;
      const rhythmGain = gain.context.createGain();
      rhythmGain.gain.value = 0.4;
      rhythmGain.connect(mid.gain);
      sources.push(rhythmLfo);
      cleanup.push(rhythmGain);

      const leadVibrato = gain.context.createOscillator();
      leadVibrato.type = 'sine';
      leadVibrato.frequency.value = 5.2;
      const vibratoGain = gain.context.createGain();
      vibratoGain.gain.value = 8;
      leadVibrato.connect(vibratoGain);
      vibratoGain.connect(leadOsc.frequency);
      sources.push(leadVibrato);
      cleanup.push(vibratoGain);

      return {
        sources,
        cleanup,
        onBuild: (g: GainNode) => {
          g.gain.setValueAtTime(0.28, now + 0.6);
        },
      };
    },
  },
};

function buildGenericBossMusic(_now: number, gain: GainNode): BossMusicResult {
  const sources: OscillatorNode[] = [];
  const cleanup: AudioNode[] = [];

  const primary = gain.context.createOscillator();
  primary.type = 'sawtooth';
  primary.frequency.value = 58;
  const primaryGain = gain.context.createGain();
  primaryGain.gain.value = 0.5;
  primary.connect(primaryGain);
  primaryGain.connect(gain);

  const secondary = gain.context.createOscillator();
  secondary.type = 'triangle';
  secondary.frequency.value = 93;
  const secondaryGain = gain.context.createGain();
  secondaryGain.gain.value = 0.35;
  secondary.connect(secondaryGain);
  secondaryGain.connect(gain);

  const sub = gain.context.createOscillator();
  sub.type = 'square';
  sub.frequency.value = 32;
  const subGain = gain.context.createGain();
  subGain.gain.value = 0.25;
  sub.connect(subGain);
  subGain.connect(gain);

  const lfo = gain.context.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.35;
  const lfoGain = gain.context.createGain();
  lfoGain.gain.value = 14;
  lfo.connect(lfoGain);
  lfoGain.connect(primary.frequency);

  sources.push(primary, secondary, sub, lfo);
  cleanup.push(primaryGain, secondaryGain, subGain, lfoGain);

  return { sources, cleanup };
}

export function buildBossMusic(bossKind: string, now: number, gain: GainNode): BossMusicResult {
  return BOSS_MUSIC_REGISTRY[bossKind]?.build(now, gain) ?? buildGenericBossMusic(now, gain);
}
