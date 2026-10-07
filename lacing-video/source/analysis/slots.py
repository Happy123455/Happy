import librosa, numpy as np, warnings, json
warnings.filterwarnings('ignore')
y, sr = librosa.load('song.mp3', sr=22050, mono=False)
mid=(y[0]+y[1])/2; side=(y[0]-y[1])/2
hop=256
D=librosa.stft(mid,n_fft=2048,hop_length=hop); H,Pc=librosa.decompose.hpss(D,margin=2.0)
Ds=librosa.stft(side,n_fft=2048,hop_length=hop)
f=librosa.fft_frequencies(sr=sr,n_fft=2048); t=librosa.frames_to_time(np.arange(D.shape[1]),sr=sr,hop_length=hop)
m=(f>=250)&(f<3000)
hv=np.abs(H[m]).mean(0); pv=np.abs(Pc[m]).mean(0); sv=np.abs(Ds[m]).mean(0); lo=np.abs(D[(f>=30)&(f<120)]).mean(0)
# spectral flatness of harmonic part in vocal band (voice = peaky)
flat = np.exp(np.log(np.abs(H[m])+1e-9).mean(0))/(np.abs(H[m]).mean(0)+1e-9)
g=json.load(open('grid.json'))
slot0=g['phase']+g['period']; P=g['period']*8
k=0; rows=[]
while slot0+k*P < 176:
    a=slot0+k*P; b=a+P; s=(t>=a)&(t<b)
    rows.append((k,a,hv[s].mean(),pv[s].mean(),sv[s].mean()/ (hv[s].mean()+1e-9),flat[s].mean(),lo[s].mean()))
    k+=1
hvm=np.median([r[2] for r in rows])
for r in rows:
    print(f"slot {r[0]:2d} {r[1]:7.2f}  harm={r[2]/hvm:5.2f} perc={r[3]/hvm:5.2f} side/harm={r[4]:5.2f} flat={r[5]:5.3f} bass={r[6]:6.2f}  "+'#'*int(20*r[2]/hvm))
