"""Render the original Ghostline GT race loop using NumPy and FFmpeg."""
from pathlib import Path
import subprocess
import tempfile
import wave

import numpy as np

RATE = 44100
BEAT = 60 / 160
BARS = 16
LENGTH = round(RATE * BEAT * 4 * BARS)
mix = np.zeros(LENGTH)
rng = np.random.default_rng(2607)


def clock(seconds):
    return np.arange(round(seconds * RATE)) / RATE


def add(beat, signal, level):
    start = round(beat * BEAT * RATE)
    mix[(start + np.arange(len(signal))) % LENGTH] += signal * level


def kick(beat):
    t = clock(.21)
    pitch = 56 + 125 * np.exp(-t * 47)
    add(beat, np.sin(2 * np.pi * pitch.cumsum() / RATE) * np.exp(-19 * t), .53)


def percussion(beat, snare=False, accent=False):
    t = clock(.165 if snare else .076 if accent else .031)
    noise = rng.uniform(-1, 1, len(t))
    bright = np.diff(noise, prepend=noise[0])
    if snare:
        body = .65 * np.sin(2 * np.pi * 176 * t) * np.exp(-40 * t)
        add(beat, body + .47 * bright * np.exp(-24 * t), .27)
    else:
        add(beat, bright * np.exp(-t * (48 if accent else 110)), .073 if accent else .038)


def synth(beat, midi, beats, level, harmonics, detune=0):
    duration = BEAT * beats
    t = clock(duration)
    phase = 2 * np.pi * (440 * 2 ** ((midi - 69) / 12)) * t
    tone = sum(weight * np.sin(harmonic * phase) for harmonic, weight in enumerate(harmonics, 1))
    if detune:
        tone += .55 * sum(weight * np.sin(harmonic * phase * (1 + detune))
                          for harmonic, weight in enumerate(harmonics, 1))
    envelope = np.minimum(1, t / .012) * np.minimum(1, (duration - t) / .042) * np.exp(-t / duration)
    add(beat, tone * envelope, level)


bass = (1, .36, .24, .13, .08)
brass = (1, .54, .32, .22, .15)
lead = (1, .35, .22, .11, .07)
riff = ((0, 0), (1.5, 12), (2.25, 7), (3.5, 10))
for bar in range(BARS):
    start = bar * 4
    root = (40, 40, 36, 38, 40, 43, 36, 35)[bar % 8]
    for step in range(16):
        beat = start + step / 4
        if step in (0, 6, 8, 11, 14):
            kick(beat)
        elif step in (4, 12) or (bar % 4 == 3 and step == 15):
            percussion(beat, snare=True)
        percussion(beat, accent=step in (2, 6, 10, 14))
        if step in (0, 2, 5, 6, 8, 10, 13, 14):
            synth(beat, root + (12 if step in (5, 13) else 0), .42, .25, bass, -.003)
    for beat, offset in riff:
        synth(start + beat, root + 24 + offset, .48, .068, lead, .004)
    for beat in (0, 2.75):
        for interval in (12, 19, 24):
            synth(start + beat, root + interval, .8, .041, brass, .004)
    if bar >= 8:
        for beat, offset in ((.75, 19), (1.75, 24), (3, 26), (3.5, 24)):
            synth(start + beat, root + 24 + offset, .29, .04, lead)

mix = np.tanh(mix * 1.2)
mix *= .8 / np.max(np.abs(mix))
output = Path(__file__).resolve().parents[1] / 'public/assets/ghostline/redline-run.mp3'
with tempfile.TemporaryDirectory() as directory:
    source = Path(directory) / 'race.wav'
    with wave.open(str(source), 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(RATE)
        audio.writeframes((mix * 32767).astype('<i2').tobytes())
    subprocess.run([
        'ffmpeg', '-y', '-v', 'error', '-i', str(source), '-c:a', 'libmp3lame', '-b:a', '56k',
        '-metadata', 'title=Redline Run', '-metadata', 'artist=Adults vs. Kids', str(output),
    ], check=True)
print(f'{output.name}: {LENGTH / RATE:.0f}s original race loop')
