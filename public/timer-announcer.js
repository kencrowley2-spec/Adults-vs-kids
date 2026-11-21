(() => {
  'use strict';

  window.createTimerAnnouncer = function createTimerAnnouncer() {
    const speech = window.speechSynthesis;
    const Utterance = window.SpeechSynthesisUtterance;
    let current = null;
    let lastSecond = null;
    let primed = false;

    function stop() {
      if (!current) return;
      current = null;
      speech.cancel();
    }

    function speak(text, volume = 1) {
      if (!speech || !Utterance) return;
      stop();
      const cue = new Utterance(text);
      cue.lang = 'en-US';
      const localVoice = speech.getVoices().find(voice => voice.localService && /^en[-_]US$/i.test(voice.lang));
      if (localVoice) cue.voice = localVoice;
      cue.rate = 1.1;
      cue.volume = volume;
      cue.onend = cue.onerror = () => {
        if (current === cue) current = null;
      };
      current = cue;
      speech.speak(cue);
    }

    return {
      prime() {
        if (primed) return;
        primed = true;
        // Unlock browser speech in the Start button's user gesture.
        speak('Ready', 0);
      },
      update(remaining) {
        const seconds = Math.ceil(remaining);
        if (seconds <= 0 || seconds === lastSecond) return;
        lastSecond = seconds;
        if (seconds <= 10) {
          speak(String(seconds));
        } else if (seconds % 60 === 0) {
          const minutes = seconds / 60;
          speak(minutes + (minutes === 1 ? ' minute to go' : ' minutes to go'));
        }
      },
      stop,
      reset() {
        stop();
        lastSecond = null;
      }
    };
  };
})();
