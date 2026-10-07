import librosa, numpy as np, warnings, json
warnings.filterwarnings('ignore')
y, sr = librosa.load('song.mp3', sr=22050, mono=True)
hop=128
yp = librosa.effects.percussive(y, margin=3.0)
oenv = librosa.onset.onset_strength(y=yp, sr=sr, hop_length=hop, aggregate=np.median)
T = len(oenv)*hop/sr
def score(period, phase, lo, hi):
    ks=np.arange(np.ceil((lo-phase)/period), np.floor((hi-phase)/period)+1); bt=phase+ks*period
    idx=np.clip(np.round(bt*sr/hop).astype(int),0,len(oenv)-1); w=2
    return np.mean([oenv[max(0,i-w):i+w+1].max() for i in idx])
best=None
for bpm in np.arange(148.0,152.0,0.02):
    p=60/bpm
    for ph in np.arange(0,p,0.004):
        s=score(p,ph,20,160)
        if best is None or s>best[0]: best=(s,bpm,ph)
print('best beat grid', best)
s,bpm,ph=best; p=60/bpm
# check local drift: score per 20 s window for a few phase shifts
for a in range(0,170,20):
    sc=[(round(d,3),round(score(p,ph+d,a,a+20),2)) for d in (-0.04,-0.02,0,0.02,0.04)]
    print(a, sc)
json.dump({'bpm':bpm,'phase':ph,'period':p}, open('grid.json','w'))
