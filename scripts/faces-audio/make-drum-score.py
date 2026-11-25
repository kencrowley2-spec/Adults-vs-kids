"""Render the original Mystery Face Showdown score to a stereo WAV."""

import argparse
import wave

import numpy as np


SAMPLE_RATE = 32_000
BEAT = 60 / 112
BAR = 4 * BEAT
BARS = 16
mix = np.zeros((round(BARS * BAR * SAMPLE_RATE), 2))
rng = np.random.default_rng(104)


def time_axis(duration):
    return np.arange(round(duration * SAMPLE_RATE)) / SAMPLE_RATE


def place(time, samples, pan=0):
    indices = (round(time * SAMPLE_RATE) + np.arange(samples.size)) % len(mix)
    mix[indices, 0] += samples * np.sqrt((1 - pan) / 2)
    mix[indices, 1] += samples * np.sqrt((1 + pan) / 2)


def drum(time, pitch, strength, pan=0, decay=7):
    t = time_axis(0.7)
    phase = 2 * np.pi * (pitch * t + 0.85 * (1 - np.exp(-t * 48)))
    shell = np.sin(phase) + 0.28 * np.sin(phase * 1.56) + 0.13 * np.sin(phase * 2.4)
    strike = rng.standard_normal(t.size) * 0.11 * np.exp(-t * 65)
    body = shell * np.exp(-t * decay)
    envelope = np.minimum(t / 0.005, 1) * np.minimum((0.7 - t) / 0.08, 1)
    place(time, strength * (body + strike) * envelope, pan)


def roll(time, strength, pan):
    t = time_axis(0.18)
    noise = rng.standard_normal(t.size)
    stroke = (noise - np.roll(noise, 1)) * np.exp(-t * 32)
    buzz = 0.6 * np.sin(2 * np.pi * 152 * t) * np.exp(-t * 26)
    place(time, strength * (0.23 * stroke + buzz) * np.minimum(t / 0.004, 1), pan)


def bowed_note(time, note, duration, strength, pan):
    t = time_axis(duration)
    pitch = 440 * 2 ** ((note - 69) / 12)
    phase = 2 * np.pi * pitch * t + 0.09 * np.sin(2 * np.pi * 4.7 * t)
    tone = np.sin(phase) + 0.44 * np.sin(phase * 2) + 0.18 * np.sin(phase * 3)
    envelope = np.minimum(t / 0.24, 1) * np.minimum((duration - t) / 0.36, 1)
    place(time, strength * tone * envelope, pan)


def swell(time, duration, strength):
    t = time_axis(duration)
    noise = rng.standard_normal(t.size)
    metallic = sum(np.sin(2 * np.pi * hz * t) for hz in (1363, 2047, 2843, 3371)) / 4
    envelope = (t / duration) ** 2.5 * np.minimum((duration - t) / 0.10, 1)
    place(time, strength * (0.55 * metallic + 0.1 * (noise - np.roll(noise, 1))) * envelope)


for bar in range(BARS):
    start = BAR * bar
    root, fifth = [(38, 45), (34, 41), (36, 43), (33, 40)][bar // 4]
    drum(start, 46, 0.24 + 0.016 * bar)
    drum(start + 2.5 * BEAT, 52, 0.13 + 0.012 * bar, 0.14)
    bowed_note(start, root, BAR + 0.2, 0.035 + 0.002 * bar, -0.32)
    bowed_note(start + 0.13, fifth, BAR, 0.021 + 0.001 * bar, 0.4)

    if bar >= 2:
        offsets = (1.5, 3) if bar < 6 else (0.75, 1.5, 2.75, 3.5)
        for hit, offset in enumerate(offsets):
            pan = -0.48 if hit % 2 == 0 else 0.48
            drum(start + offset * BEAT, 85 + 11 * (hit % 2), 0.09 + 0.008 * bar, pan, 11)
    if 6 <= bar <= 14:
        for stroke in range(8 if bar >= 10 else 4):
            offset = 2 + stroke / (4 if bar >= 10 else 2)
            roll(start + offset * BEAT, 0.036 + 0.005 * stroke, 0.35 if stroke % 2 else -0.35)
    if 8 <= bar <= 14:
        upper = [root + 24, fifth + 12, root + 19, fifth + 12]
        for step, note in enumerate(upper):
            bowed_note(start + step * BEAT, note, 0.9 * BEAT, 0.06 + 0.004 * (bar - 8), 0.24)

for bar in (3, 7, 11, 14):
    swell(bar * BAR + BEAT, 3 * BEAT, 0.20 if bar < 11 else 0.29)

# Let the final accent and its room reflections resolve into the quiet opening.
drum(15 * BAR + BEAT, 42, 0.42, decay=4.5)
for delay, gain in ((0.043, 0.13), (0.089, 0.08), (0.151, 0.035)):
    mix += gain * np.roll(mix[:, ::-1], round(delay * SAMPLE_RATE), axis=0)
mix = np.tanh(mix * 1.85) * 0.84

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("output", help="Output WAV filename")
with wave.open(parser.parse_args().output, "wb") as audio:
    audio.setnchannels(2)
    audio.setsampwidth(2)
    audio.setframerate(SAMPLE_RATE)
    audio.writeframes((mix * 32767).astype("<i2").tobytes())
