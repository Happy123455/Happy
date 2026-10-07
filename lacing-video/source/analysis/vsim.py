import librosa, numpy as np, warnings, json
warnings.filterwarnings('ignore')
y, sr = librosa.load('center_voc.wav', sr=22050, mono=True)
g=json.load(open('grid.json')); per=g['period']; ph=g['phase']
hop=256
# vocal-band features: chroma (melody) + mfcc (phonetic) restricted
S=np.abs(librosa.stft(y,n_fft=2048,hop_length=hop))
f=librosa.fft_frequencies(sr=sr,n_fft=2048)
S[(f<250)|(f>3500)]=0
C=librosa.feature.chroma_stft(S=S**2,sr=sr,hop_length=hop)
Mf=librosa.feature.mfcc(S=librosa.power_to_db(librosa.feature.melspectrogram(S=S**2,sr=sr,n_mels=64,fmin=250,fmax=3500)),n_mfcc=16)[1:]
# 1/2-beat resolution sync
subs = ph + per/2*np.arange(0, int(176/(per/2)))
bf=librosa.time_to_frames(subs,sr=sr,hop_length=hop)
Cs=librosa.util.sync(C,bf,aggregate=np.mean); Ms=librosa.util.sync(Mf,bf,aggregate=np.mean)
Ms=(Ms-Ms.mean(1,keepdims=True))/(Ms.std(1,keepdims=True)+1e-9)
X=np.vstack([Cs*4, Ms])
n=55; seqs=[]
for k in range(n):
    a=2*(1+8*k); seqs.append(X[:,a:a+16] if a+16<=X.shape[1] else None)
def sim(A,B):
    A=A.ravel()-A.mean(); B=B.ravel()-B.mean(); return float(A@B/(np.linalg.norm(A)*np.linalg.norm(B)+1e-9))
S2=np.full((n,n),np.nan)
for i in range(n):
    for j in range(n):
        if seqs[i] is not None and seqs[j] is not None: S2[i,j]=sim(seqs[i],seqs[j])
np.save('S2.npy',S2)
for i in range(n):
    if seqs[i] is None: continue
    best=sorted([(S2[i,j],j) for j in range(n) if abs(i-j)>=1 and not np.isnan(S2[i,j])],reverse=True)[:4]
    print(f"slot {i:2d} {ph+per*(1+8*i):7.2f}: "+'  '.join(f"{j:2d}({v:.2f})" for v,j in best))
