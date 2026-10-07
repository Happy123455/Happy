import librosa, numpy as np, json, scipy.signal as ss, warnings
warnings.filterwarnings('ignore')
FPS=60
y, sr = librosa.load('song.mp3', sr=22050, mono=True)
dur=len(y)/sr; nF=int(np.ceil(dur*FPS))
hop=256
S=np.abs(librosa.stft(y,n_fft=2048,hop_length=hop)); f=librosa.fft_frequencies(sr=sr,n_fft=2048)
t=librosa.frames_to_time(np.arange(S.shape[1]),sr=sr,hop_length=hop)
def band(lo,hi): m=(f>=lo)&(f<hi); return np.sqrt((S[m]**2).mean(0))
yp=librosa.effects.percussive(y,margin=2.0); P=np.abs(librosa.stft(yp,n_fft=1024,hop_length=128)); f2=librosa.fft_frequencies(sr=sr,n_fft=1024); t2=librosa.frames_to_time(np.arange(P.shape[1]),sr=sr,hop_length=128)
def flux(lo,hi):
    m=(f2>=lo)&(f2<hi); X=np.log1p(10*P[m]); return np.maximum(0,np.diff(X,axis=1,prepend=X[:,:1])).mean(0)
def toF(tt,x):
    out=np.interp(np.arange(nF)/FPS, tt, x); return out
def norm(x): return np.clip(x/(np.percentile(x,98)+1e-9),0,1.5)
feat={'fps':FPS,'n':nF,'dur':dur}
for name,(lo,hi) in {'rms':(20,11000),'low':(25,140),'mid':(300,3000),'high':(5000,11000)}.items():
    feat[name]=norm(toF(t,band(lo,hi))).round(3).tolist()
feat['kick']=norm(toF(t2,flux(30,140))).round(3).tolist()
feat['snare']=norm(toF(t2,flux(1500,6000))).round(3).tolist()
edges=np.geomspace(35,11000,25); bars=[]
for j in range(24):
    m=(f>=edges[j])&(f<edges[j+1]); bars.append(np.log1p(S[m].mean(0)))
bars=np.array(bars); bars=bars/(np.percentile(bars,99,axis=1,keepdims=True)+1e-9)
feat['bars']=[np.clip(np.interp(np.arange(nF)/FPS,t,b),0,1.2).round(2).tolist() for b in bars]
json.dump(feat,open('features.json','w'))
# timeline
g=json.load(open('grid.json')); per=g['period']; ph=g['phase']
beats=[round(ph+per*k,4) for k in range(int((dur-ph)/per)+1)]
slot=lambda k: ph+per*(1+8*k)
gu=[l.strip() for l in open('lines.txt') if l.strip()]
en=["Input data is ready on the table","Two ISMC 350 profiles, looking sharp","Clear spacing 240 — Limit State Method",
"Times the 1.5 factor: a 1500 kN load","Length 5 metres, Fe 410 grade","γm0 1.10, γmb 1.25 — no sins here",
"Area 5366, depth 350, flange 100","rz 136.6, ry 28.3 — the numbers hold","Gauge line 50 mm, transverse 340",
"A 45° angle — no knots in the maths","a = 2·a1·cot 45° = 680 mm, final","Slenderness check — a vital step",
"680 ÷ 28.3 — the answer: 24.03","Under 50 — this column won't go loose","0.7 × 36.6 = 25.62",
"No chance of local buckling here","Clause 7.6.6.1 — transverse shear's turn","2.5% of the load: Vt = 37.5 kN",
"18.75 per plane, 26.52 per bar","F = V / sin θ — keep your eyes on the maths","Length 480.83, a 14 mm flat",
"50 mm wide — the connection is set","Radius 4.04, slenderness λ = 119","Table 9(c): Pd = 59.36 — passed",
"Length 480.83, a 14 mm flat","50 mm wide — the connection is set","Radius 4.04, slenderness λ = 119","Table 9(c): Pd = 59.36 — passed",
"Tension capacity 132.23 — all secure","The last step: the bolt's strength, locked in","M16, grade 4.6 — shear 28.98",
"Bearing 86.8 — no burden at all","26.52 ÷ 28.98 = 0.92","One bolt on site — the maths' true dream",
"The final summary — the full design","50×14 flat, 45°, spaced 680 mm","One M16 bolt, end distance 30",
"The design is safe — the essence of engineering"]
assert len(en)==len(gu)==38
slots=list(range(1,14))+list(range(15,22))+[29,30,31,32,34,35,36,37]+[38]+list(range(42,51))
assert len(slots)==38, len(slots)
lines=[]
for i,(k,a,b) in enumerate(zip(slots,gu,en)):
    st=slot(k)
    nxt=slot(slots[i+1]) if i+1<len(slots) else slot(51)
    end=min(nxt, st+per*8*2)  # hold at most 2 slots
    lines.append({'i':i,'slot':k,'t':round(st-0.06,3),'end':round(end-0.06,3),'gu':a,'en':b})
# on-screen caption fixes: restore the γ symbols the subtitles dropped, add maths symbols and dashes,
# and show the correct lacing force formula (the line is sung as "F = V sin theta")
DISPLAY={2:'ક્લીયર સ્પેસિંગ 240 — લિમિટ સ્ટેટ મેથડ',5:'γm0 1.10  γmb 1.25 નથી કોઈ પણ પાપ',
         10:'a = 2a₁ cot 45° = 680 mm ફાઇનલ',13:'50 થી ઓછું — કોલમ નથી થવાની હવે લુઝ',
         14:'0.7 × 36.6 એટલે 25.62',19:'F = V / sin θ ગણતરી પર ધ્યાન આપ તું'}
for i,s_ in DISPLAY.items(): lines[i]['gu']=s_
sections=[('intro',0,slot(1)),('data',slot(1),slot(6)),('verse1',slot(6),slot(14)),('break',slot(14),slot(15)),
          ('checks',slot(15),slot(24)),('inst',slot(24),slot(29)),('chorus',slot(29),slot(38)),('breakdown',slot(38),slot(42)),
          ('verse3',slot(42),slot(51)),('outro',slot(51),dur)]
json.dump({'per':per,'phase':ph,'beats':beats,'slot0':slot(0),'lines':lines,'sections':[{'name':n,'a':round(a,3),'b':round(b,3)} for n,a,b in sections],'dur':dur},
          open('timeline.json','w'),ensure_ascii=False,indent=1)
for l in lines: print(f"L{l['i']:02d} slot{l['slot']:2d} {l['t']:7.2f}-{l['end']:7.2f} {l['gu']}")
for s in sections: print(s)
