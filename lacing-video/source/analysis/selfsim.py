import librosa, numpy as np, warnings, json
warnings.filterwarnings('ignore')
y, sr = librosa.load('song.mp3', sr=22050, mono=True)
g=json.load(open('grid.json')); per=g['period']; ph=g['phase']
hop=512
C = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
M = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=20)[1:]
yh = librosa.effects.harmonic(y, margin=3.0)
Ch = librosa.feature.chroma_cqt(y=yh, sr=sr, hop_length=hop)
t = librosa.frames_to_time(np.arange(C.shape[1]), sr=sr, hop_length=hop)
beats = ph + per*np.arange(0, int(176/per))
bf = librosa.time_to_frames(beats, sr=sr, hop_length=hop)
Cs = librosa.util.sync(Ch, bf, aggregate=np.mean); Ms = librosa.util.sync(M, bf, aggregate=np.mean)
# per-slot sequences of 8 beats starting at beat 1 + 8k
slots=[]; k=0
while 1+8*k+8 <= Cs.shape[1]:
    a=1+8*k; slots.append((np.vstack([Cs[:,a:a+8]*3, librosa.util.normalize(Ms[:,a:a+8],axis=0)]))); k+=1
n=len(slots)
S=np.zeros((n,n))
for i in range(n):
    for j in range(n):
        A=slots[i].ravel(); B=slots[j].ravel(); A=A-A.mean(); B=B-B.mean()
        S[i,j]=A@B/(np.linalg.norm(A)*np.linalg.norm(B)+1e-9)
np.save('S.npy',S)
for i in range(n):
    best=sorted([(S[i,j],j) for j in range(n) if abs(i-j)>=2], reverse=True)[:4]
    print(f"slot {i:2d} {ph+per*(1+8*i):7.2f}: "+'  '.join(f"{j:2d}({v:.2f})" for v,j in best))
# diagonal strength for lags
print('lag scores (mean of diag):', [(L, round(float(np.mean([S[i,i+L] for i in range(n-L)])),3)) for L in range(1,20)])
