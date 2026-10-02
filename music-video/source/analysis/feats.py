import librosa, numpy as np, json, scipy.signal as ss
y, sr = librosa.load('song.m4a', sr=22050, mono=True)
dur=len(y)/sr; FPS=30; nF=int(np.ceil(dur*FPS))
hop=128; n_fft=1024
yp = librosa.effects.percussive(y, margin=2.0)
S = np.abs(librosa.stft(yp, n_fft=n_fft, hop_length=hop))
Sf = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
f = librosa.fft_frequencies(sr=sr, n_fft=n_fft); f2=librosa.fft_frequencies(sr=sr,n_fft=2048)
t = librosa.frames_to_time(np.arange(S.shape[1]), sr=sr, hop_length=hop)
def flux(lo,hi):
    m=(f>=lo)&(f<hi); X=np.log1p(10*S[m]); d=np.maximum(0,np.diff(X,axis=1,prepend=X[:,:1])); return d.mean(0)
kick=flux(35,130); snare=flux(1500,7000); hat=flux(7000,11000)
def peaks(env, thr_pct, mindist):
    env=env/ (np.percentile(env,99.5)+1e-9)
    p,_=ss.find_peaks(env, height=thr_pct, distance=int(mindist*sr/hop))
    return t[p], env[p]
kt,kv=peaks(kick,0.35,0.18); st,sv=peaks(snare,0.35,0.18)
print('kicks',len(kt),'snares',len(st))
print('kicks 41-52', np.round(kt[(kt>41)&(kt<52)],3))
print('snares 41-52', np.round(st[(st>41)&(st<52)],3))
# per-frame continuous features
def band_energy(lo,hi):
    m=(f2>=lo)&(f2<hi); return np.sqrt((Sf[m]**2).mean(0))
rms=np.sqrt((Sf**2).mean(0)); low=band_energy(30,150); mid=band_energy(150,3000); high=band_energy(3000,11000)
def toframes(x, mode='mean'):
    out=np.zeros(nF)
    for i in range(nF):
        a=i/FPS; b=(i+1)/FPS; m=(t>=a)&(t<b)
        out[i]= x[m].max() if m.any() else 0
    return out
def norm(x): return np.clip(x/(np.percentile(x,98)+1e-9),0,1.5)
feat={'fps':FPS,'n':nF,'dur':dur,
 'rms':norm(toframes(rms)).round(3).tolist(),'low':norm(toframes(low)).round(3).tolist(),
 'mid':norm(toframes(mid)).round(3).tolist(),'high':norm(toframes(high)).round(3).tolist(),
 'kickflux':norm(toframes(kick)).round(3).tolist(),'snareflux':norm(toframes(snare)).round(3).tolist(),
 'kicks':[[round(a,3),round(float(b),2)] for a,b in zip(kt,kv)],'snares':[[round(a,3),round(float(b),2)] for a,b in zip(st,sv)]}
# also spectrum bars (32 log bands) per frame for visualizer
edges=np.geomspace(40,10000,33); bars=[]
for j in range(32):
    m=(f2>=edges[j])&(f2<edges[j+1]); bars.append(np.log1p(Sf[m].mean(0)))
bars=np.array(bars); bars=bars/ (np.percentile(bars,99,axis=1,keepdims=True)+1e-9)
bf=np.zeros((nF,32))
for i in range(nF):
    a=i/FPS; b=(i+1)/FPS; m=(t>=a)&(t<b)
    if m.any(): bf[i]=bars[:,m].mean(1)
feat['bars']=np.clip(bf,0,1.2).round(2).tolist()
json.dump(feat,open('features.json','w'))
print('saved', nF)
