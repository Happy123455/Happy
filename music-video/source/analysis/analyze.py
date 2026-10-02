import librosa, numpy as np, json
y, sr = librosa.load('song.m4a', sr=22050, mono=True)
dur = len(y)/sr
print('duration', dur)
hop = 256
oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
tempo, beats = librosa.beat.beat_track(onset_envelope=oenv, sr=sr, hop_length=hop, units='time', tightness=100)
print('tempo', tempo, 'nbeats', len(beats))
ib = np.diff(beats)
print('median IBI', np.median(ib), '-> bpm', 60/np.median(ib))
# per-second rms profile
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
times = librosa.frames_to_time(np.arange(S.shape[1]), sr=sr, hop_length=hop)
def band(lo,hi):
    m=(freqs>=lo)&(freqs<hi); return np.sqrt((S[m]**2).mean(0))
low=band(20,150); mid=band(150,2500); high=band(5000,11000)
rms = np.sqrt((S**2).mean(0))
for sec in range(0,int(dur)+1,2):
    m=(times>=sec)&(times<sec+2)
    if m.sum()==0: continue
    print(f"{sec:4d}s rms={20*np.log10(rms[m].mean()+1e-9):6.1f} low={20*np.log10(low[m].mean()+1e-9):6.1f} mid={20*np.log10(mid[m].mean()+1e-9):6.1f} high={20*np.log10(high[m].mean()+1e-9):6.1f} beats={((beats>=sec)&(beats<sec+2)).sum()}")
np.save('beats.npy', beats)
