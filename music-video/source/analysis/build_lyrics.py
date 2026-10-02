import json, re, numpy as np, librosa, scipy.signal as ss
from pocketsphinx import Decoder
raw=json.load(open('align_raw.json'))
# retry failed lines with wider windows
y, sr = librosa.load('song.m4a', sr=16000, mono=True)
b,a=ss.butter(4,[200/8000,4000/8000],btype='band'); yv=ss.filtfilt(b,a,y)
dec=Decoder(samprate=16000, bestpath=False, loglevel='FATAL')
for r in raw:
    if r['segs']: continue
    toks=[t.lower() for t in r['tokens']]
    for pad in [(0.4,0.4),(0.8,0.3),(0.2,1.0)]:
        s0=r['start']-pad[0]; e0=r['end']+pad[1]
        seg=yv[int(s0*sr):int(e0*sr)]; seg=(seg*32767*0.9/(np.abs(seg).max()+1e-9)).astype(np.int16).tobytes()
        try:
            dec.set_align_text(' '.join(toks)); dec.start_utt(); dec.process_raw(seg, full_utt=True); dec.end_utt()
            segs=[(sg.word, s0+sg.start_frame/100, s0+(sg.end_frame+1)/100) for sg in dec.seg() if sg.word not in ('<sil>','<s>','</s>','(NULL)','[NOISE]')]
            if len(segs)==len(toks): r['segs']=segs; print('fixed line',r['i'],pad); break
        except Exception as ex: pass
    if not r['segs']:
        # syllable-proportional fallback
        def syl(w): return max(1,len(re.findall(r'[aeiouy]+',w)))
        ws=[syl(t) for t in toks]; tot=sum(ws); t=r['start']; span=(r['end']-r['start'])*0.92; segs=[]
        for t_,w in zip(toks,ws):
            d=span*w/tot; segs.append((t_,t,t+d)); t+=d
        r['segs']=segs; print('fallback line',r['i'])
lines=[]
for r in raw:
    segs=r['segs']; toks=r['tokens']
    assert len(segs)==len(toks), (r['i'],len(segs),len(toks))
    # display words: split on spaces; each display word consumes N tokens
    disp=r['text'].split()
    k=0; words=[]
    for d in disp:
        n=len(re.findall(r"[A-Za-z']+|[0-9]+", d))
        if n==0:
            continue
        ss_=segs[k:k+n]; k+=n
        words.append({'w':d,'s':round(ss_[0][1],3),'e':round(ss_[-1][2],3)})
    assert k==len(segs)
    # monotonic cleanup
    for j in range(1,len(words)):
        if words[j]['s']<words[j-1]['s']: words[j]['s']=words[j-1]['s']+0.02
    lines.append({'i':r['i'],'s':round(min(words[0]['s'],r['start']),3),'e':round(max(r['end'],words[-1]['e']),3),'text':r['text'],'words':words})
json.dump(lines,open('lyrics.json','w'),indent=0)
for L in lines:
    print(f"L{L['i']:02d} {L['s']:7.2f} | "+' '.join(f"{w['w']}@{w['s']:.2f}" for w in L['words']))
