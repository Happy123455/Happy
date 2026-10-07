import librosa, numpy as np, warnings, json, matplotlib
warnings.filterwarnings('ignore'); matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.ndimage import uniform_filter1d
y, sr = librosa.load('song.mp3', sr=22050, mono=False)
L,R=y; hop=256
SL=librosa.stft(L,n_fft=2048,hop_length=hop); SR=librosa.stft(R,n_fft=2048,hop_length=hop)
M=(SL+SR)/2; Sd=(SL-SR)/2
# centre extraction: keep bins where L and R are nearly identical (phase & magnitude)
sim = np.abs(SL*np.conj(SR))/(0.5*(np.abs(SL)**2+np.abs(SR)**2)+1e-9)   # 1 = identical
mask = np.clip((sim-0.85)/0.15,0,1)**2
C = M*mask
H,_ = librosa.decompose.hpss(C, margin=(1.5,3.0))
f=librosa.fft_frequencies(sr=sr,n_fft=2048); t=librosa.frames_to_time(np.arange(M.shape[1]),sr=sr,hop_length=hop)
band=(f>=280)&(f<3200)
v=np.log1p(20*np.abs(H[band]).mean(0)); v=uniform_filter1d(v,5)
np.save('cvoc.npy', np.vstack([t,v]))
y_c = librosa.istft(H, hop_length=hop)
import soundfile as sf; sf.write('center_voc.wav', y_c/ (np.abs(y_c).max()+1e-9)*0.9, sr)
g=json.load(open('grid.json')); per=g['period']; ph=g['phase']
Hdb=librosa.amplitude_to_db(np.abs(H),ref=np.max)
for k in range(6):
    a,b=k*30,min(176.4,k*30+30); sel=(t>=a)&(t<b); fs=(f>=100)&(f<3500)
    fig,ax=plt.subplots(2,1,figsize=(30,7),gridspec_kw={'height_ratios':[3,1.3]},sharex=True)
    ax[0].imshow(Hdb[np.ix_(fs,sel)],origin='lower',aspect='auto',extent=[a,b,100,3500],cmap='magma',vmin=-65,vmax=0)
    ax[1].plot(t[sel],v[sel],'k',lw=1)
    n0=int(np.ceil((a-ph)/per)); 
    for n in range(n0, int((b-ph)/per)+1):
        bt=ph+per*n; c='red' if (n-1)%8==0 else ('orange' if (n-1)%4==0 else 'c'); lw=2 if c=='red' else (1.2 if c=='orange' else 0.4)
        ax[0].axvline(bt,color=c,lw=lw,alpha=0.8); ax[1].axvline(bt,color=c,lw=lw,alpha=0.8)
    ax[1].set_xticks(np.arange(a,b+0.01,1)); ax[1].tick_params(labelsize=10)
    plt.tight_layout(); plt.savefig(f'cspec_{k}.png',dpi=55); plt.close()
print('ok')
