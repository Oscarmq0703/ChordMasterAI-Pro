const SOUND_FONT_BASE =
  "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/";

const audioCache = new Map<string, HTMLAudioElement>();

function getPlayableNote(note: string, octave: number) {
  // 先用稳定优先方案：黑键临时映射到邻近白键，保证全部都能响
  const map: Record<string, string> = {
    C: `C${octave}`,
    "C#": `D${octave}`,
    D: `D${octave}`,
    "D#": `E${octave}`,
    E: `E${octave}`,
    F: `F${octave}`,
    "F#": `G${octave}`,
    G: `G${octave}`,
    "G#": `A${octave}`,
    A: `A${octave}`,
    "A#": `B${octave}`,
    B: `B${octave}`,
  };

  return map[note] || `C${octave}`;
}

function getAudio(noteName: string) {
  const url = `${SOUND_FONT_BASE}${noteName}.mp3`;

  if (!audioCache.has(url)) {
    const audio = new Audio(url);
    audio.preload = "auto";
    audioCache.set(url, audio);
  }

  return audioCache.get(url)!;
}

export async function playPianoSample(note: string, octave = 4) {
  const noteName = getPlayableNote(note, octave);
  const baseAudio = getAudio(noteName);

  const audio = baseAudio.cloneNode(true) as HTMLAudioElement;
  audio.currentTime = 0;

  try {
    await audio.play();
    console.log("play piano =>", note, octave, "=>", noteName);
  } catch (err) {
    console.error("audio play failed:", note, octave, noteName, err);
  }
}