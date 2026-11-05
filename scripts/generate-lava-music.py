"""Render the original 144-BPM Lava Heatwave loop. Requires numpy and ffmpeg."""
from pathlib import Path
import tempfile, subprocess, wave
import numpy as np

RATE, BPM, BARS = 44100, 144, 16
beat = 60 / BPM
length = int(RATE * beat * BARS * 4)
mix = np.zeros((length, 2), dtype=np.float64)
rng = np.random.default_rng(829)

def add(at, signal, level=1, pan=0):
    start = int(at * RATE)
    # Wrap note tails into the start so the waveform loops musically.
    positions = (start + np.arange(len(signal))) % length
    mix[positions, 0] += signal * level * np.sqrt((1-pan)/2)
    mix[positions, 1] += signal * level * np.sqrt((1+pan)/2)

def note(at, midi, duration, level, style='lead', pan=0):
    t = np.arange(int(duration*RATE)) / RATE
    hz = 440 * 2 ** ((midi-69)/12)
    if style == 'bass':
        signal = np.sin(2*np.pi*hz*t) + .28*np.sin(4*np.pi*hz*t) + .12*np.sin(6*np.pi*hz*t)
    else:
        signal = sum(np.sin(2*np.pi*hz*(1+detune)*t*h)/h**1.5 for h in range(1, 6) for detune in [-.0015, .0015]) / 2
    envelope = np.minimum(1,t/.008) * np.minimum(1,(duration-t)/.055) * np.exp(-t/(duration*1.8))
    add(at, signal*envelope, level, pan)

def kick(at):
    t = np.arange(int(.25*RATE))/RATE
    frequency = 48 + 112*np.exp(-t*45)
    signal = np.sin(2*np.pi*np.cumsum(frequency)/RATE)*np.exp(-t*19)
    add(at,signal,.48)

def drum(at, snare=False, opened=False):
    duration = .18 if snare else .12 if opened else .045
    t = np.arange(int(duration*RATE))/RATE
    noise = rng.uniform(-1,1,len(t))
    high = np.r_[0,np.diff(noise)]
    signal = high * np.exp(-t*(27 if snare else 40 if opened else 95))
    if snare: signal += .5*np.sin(2*np.pi*185*t)*np.exp(-t*35)
    add(at,signal,.19 if snare else .055, -.18 if snare else .3)

hook = [76,None,79,83,81,None,79,76,74,76,79,None,83,81,79,74]
for bar in range(BARS):
    root = [40,36,43,38][bar%4]  # E minor, C, G, D
    for quarter in range(4):
        at = (bar*4+quarter)*beat
        kick(at)
        if quarter%2: drum(at,True)
    for step in range(16):
        at = (bar*4+step/4)*beat
        if step%2==0: drum(at,opened=step in [6,14])
        if step%2==0:
            note(at,root+(12 if step in [6,14] else 0),beat*.39,.24,'bass')
        if step in [0,6,8,14]:
            for interval in [12,19,24]: note(at,root+interval,beat*.34,.037,'lead',-.35)
        melody = hook[step]
        if melody is not None:
            melody += [0,-5,3,-2][bar%4]
            note(at,melody,beat*.37,.115,'lead',.15)
            note(at+beat*.75,melody,beat*.3,.025,'lead',-.45)
        if bar%4==3 and step in [13,14,15]: drum(at,True)
# Soft saturation and a stable master ceiling; no speech or external samples.
mix = np.tanh(mix*1.15)
mix *= .86 / max(np.max(np.abs(mix)), .01)
output = Path(__file__).resolve().parents[1] / 'public/assets/lava-heatwave.mp3'
with tempfile.TemporaryDirectory() as temp:
    wav = Path(temp)/'loop.wav'
    with wave.open(str(wav),'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(RATE)
        f.writeframes((mix*32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-c:a','libmp3lame','-b:a','128k','-metadata','title=Lava Heatwave','-metadata','artist=Adults vs. Kids',str(output)],check=True)
print(f'{output.name}: {length/RATE:.2f}s original stereo loop')
