// Keep one backing track per match. The gain node also handles mobile browsers
// that leave the media element's volume under hardware control.
export function flexAudio(initialSound) {
  let enabled = initialSound, playing = false, music, voice, context, gain, speaking = false;
  function mix() {
    const volume = speaking ? 0.055 : 0.32;
    if (gain) gain.gain.setTargetAtTime(volume, context.currentTime, 0.06);
    else if (music) music.volume = volume;
  }
  function stopVoice() {
    if (voice) {
      voice.onended = voice.onerror = null;
      voice.pause();
      voice = null;
    }
    speaking = false;
    mix();
  }
  function resume() {
    if (!enabled || !playing || document.hidden) return;
    if (!music) {
      music = new window.Audio('/assets/flex/flex-groove.mp3');
      music.loop = true;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        context = new AudioContext();
        gain = context.createGain();
        context.createMediaElementSource(music).connect(gain).connect(context.destination);
      }
    }
    mix();
    context?.resume().catch(() => {});
    music.play().catch(() => {});
  }
  return {
    start() { playing = true; resume(); },
    stop() { playing = false; stopVoice(); music?.pause(); if (music) music.currentTime = 0; },
    mute(value) { enabled = !value; if (enabled) resume(); else { stopVoice(); music?.pause(); } },
    visibility() { if (document.hidden) { stopVoice(); music?.pause(); } else resume(); },
    say(card) {
      stopVoice();
      if (!enabled) return;
      const clip = new window.Audio('/assets/flex/voice/' + card.id + '.mp3');
      voice = clip;
      speaking = true;
      mix();
      const ended = () => { if (voice === clip) stopVoice(); };
      clip.onended = clip.onerror = ended;
      clip.play().catch(ended);
    },
    stopVoice,
    dispose() { playing = false; stopVoice(); music?.pause(); context?.close().catch(() => {}); }
  };
}
