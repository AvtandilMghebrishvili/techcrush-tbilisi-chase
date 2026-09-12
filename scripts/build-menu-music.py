"""Original 8-bar TECHCRUSH electronic loop. No sampled/copyrighted music."""
import math, random, wave, struct
from pathlib import Path
rate=22050; beat=60/128; duration=beat*32; random.seed(90)
notes=[55,55,65.406,49,55,73.416,65.406,49]
samples=[]
for i in range(round(duration*rate)):
 t=i/rate; b=t/beat; step=int(b); phase=b-step
 kick=math.sin(2*math.pi*(48*phase*beat+10*(1-math.exp(-phase*20))))*math.exp(-phase*12)*.36
 hat=(random.random()*2-1)*math.exp(-((b*2)%1)*35)*.07
 snare=(random.random()*2-1)*math.exp(-phase*16)*.16 if step%4 in (1,3) else 0
 f=notes[(step//4)%8];bass=(math.sin(t*f*2*math.pi)+.25*math.sin(t*f*4*math.pi))*math.exp(-phase*3)*.19
 arpF=f*2*[1,1.5,2,2.5][int(b*2)%4];arp=math.sin(t*arpF*2*math.pi)*math.exp(-((b*2)%1)*6)*.055
 samples.append(int(max(-1,min(1,kick+hat+snare+bass+arp))*30000))
out=Path(__file__).resolve().parent.parent/'dist/assets/techcrush-drive.wav'
with wave.open(str(out),'wb') as w:w.setparams((1,2,rate,len(samples),'NONE','not compressed'));w.writeframes(struct.pack('<'+'h'*len(samples),*samples))
print(out.name,out.stat().st_size)
