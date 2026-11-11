import numpy as np, wave, sys
sr=32000;beat=60/112;bars=16;duration=bars*4*beat
out=np.zeros((int(duration*sr),2),dtype=np.float64);rng=np.random.default_rng(42)
def note(m):return 440*2**((m-69)/12)
def add(t,x,pan=0):
 start=int(t*sr);a=max(0,start);n=min(len(x),len(out)-a)
 if n<=0:return
 out[a:a+n,0]+=x[:n]*(.7-pan*.25);out[a:a+n,1]+=x[:n]*(.7+pan*.25)
def piano(t,m,vol=.07):
 x=np.arange(int(.95*sr))/sr;f=note(m);y=sum(np.sin(2*np.pi*f*h*x)*np.exp(-x*(2+h*.65))/h**1.6 for h in range(1,6));y*=np.minimum(x/.008,1);add(t,y*vol,-.25)
def bass(t,m):
 x=np.arange(int(.46*sr))/sr;f=note(m);y=(np.sin(2*np.pi*f*x)+.35*np.sin(4*np.pi*f*x)+.13*np.sin(6*np.pi*f*x))*np.exp(-x*6)*np.minimum(x/.006,1);add(t,y*.18,-.1)
def brush(t,accent=False):
 n=int(sr*.14);noise=rng.normal(0,1,n);y=np.r_[0,np.diff(noise)]*np.exp(-np.arange(n)/sr*35);add(t,y*(.025 if accent else .009),.3)
def ride(t):
 x=np.arange(int(.23*sr))/sr;y=sum(np.sin(2*np.pi*f*x) for f in [3217,4283,5761,6871])*np.exp(-x*24);add(t,y*.008,.45)
def horn(t,m,d=.7):
 x=np.arange(int(d*sr))/sr;f=note(m);phase=2*np.pi*f*x+.012*np.sin(2*np.pi*5*x);env=np.minimum(x/.07,1)*np.minimum((d-x)/.13,1)*.045;y=(np.sin(phase)+.27*np.sin(phase*2)+.13*np.sin(phase*3))*env;add(t,y,.2)
chords=[([50,57,60,65],[38,41,45,47]),([47,53,57,62],[43,47,50,41]),([48,55,59,64],[36,40,43,45]),([49,55,58,64],[45,49,52,51])]
for bar in range(bars):
 chord,walk=chords[bar%4];base=bar*4*beat
 for q,m in enumerate(walk):bass(base+q*beat,m)
 for q in range(4):
  ride(base+q*beat);ride(base+(q+2/3)*beat);brush(base+q*beat,q%2==1)
 for offset in [.0,1.667,2.667]:
  for i,m in enumerate(chord):piano(base+offset*beat+i*.008,m,.045)
 if bar%4 in [0,2]:
  melody=[(0,74),(2/3,77),(1.667,76),(2.667,72)] if bar%4==0 else [(0,71),(1,74),(2.667,72)]
  for off,m in melody:horn(base+off*beat,m,.42)
# Short room reflection, seamless cyclic tail.
for delay,gain in [(.047,.1),(.093,.06)]:out+=np.roll(out,int(delay*sr),axis=0)*gain
out=np.tanh(out*1.2);out*=.75/max(1,np.max(np.abs(out)))
with wave.open(sys.argv[1] if len(sys.argv)>1 else 'showtime-jazz.wav','wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((out*32767).astype('<i2').tobytes())
print('Original 16-bar swing loop:',duration,'seconds')
