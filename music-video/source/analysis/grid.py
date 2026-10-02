import librosa, numpy as np
y, sr = librosa.load('song.m4a', sr=22050, mono=True)
hop=128
# percussive onset envelope, low band emphasised for kicks
yp = librosa.effects.percussive(y, margin=2.0)
oenv = librosa.onset.onset_strength(y=yp, sr=sr, hop_length=hop, aggregate=np.median)
t = librosa.frames_to_time(np.arange(len(oenv)), sr=sr, hop_length=hop)
np.save('oenv.npy', oenv); np.save('oenv_t.npy', t)
def score(period, phase, lo, hi):
    ks = np.arange(np.ceil((lo-phase)/period), np.floor((hi-phase)/period)+1)
    bt = phase + ks*period
    idx = np.clip(np.round(bt/(hop/sr)).astype(int),0,len(oenv)-1)
    # take max in +-20ms window
    w=int(0.02*sr/hop)
    return np.mean([oenv[max(0,i-w):i+w+1].max() for i in idx])
def best(lo,hi):
    bestv=None
    for bpm in np.arange(89.5,92.0,0.01):
        p=60/bpm
        for ph in np.arange(0,p,0.005):
            s=score(p,ph,lo,hi)
            if bestv is None or s>bestv[0]: bestv=(s,bpm,ph)
    return bestv
for lo,hi in [(42,133),(166,191),(210,226),(42,226)]:
    s,bpm,ph=best(lo,hi); print(lo,hi,'bpm %.3f phase %.4f score %.3f'%(bpm,ph,s))
