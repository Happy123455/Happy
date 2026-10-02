import re, json, numpy as np, librosa, os, sys
from pocketsphinx import Decoder, get_model_path
mp = get_model_path()
dictfile = os.path.join(mp,'en-us','cmudict-en-us.dict')
words_in_dict=set()
for l in open(dictfile):
    w=l.split()[0]; words_in_dict.add(re.sub(r'\(\d+\)$','',w))
def parse_srt(p):
    blocks=open(p).read().strip().split('\n\n'); out=[]
    for b in blocks:
        ls=b.split('\n'); a,c=ls[1].split(' --> ')
        f=lambda s: int(s[:2])*3600+int(s[3:5])*60+float(s[6:].replace(',','.'))
        out.append((f(a),f(c),' '.join(ls[2:])))
    return out
lines=[l for l in parse_srt('subs.srt') if not l[2].startswith('**')]
y, sr = librosa.load('song.m4a', sr=16000, mono=True)
# emphasise vocal band
import scipy.signal as ss
b,a=ss.butter(4,[200/8000,4000/8000],btype='band'); yv=ss.filtfilt(b,a,y)
def tokens(text):
    raw=re.findall(r"[A-Za-z']+|[0-9]+", text)
    return raw
res=[]
dec = Decoder(samprate=16000, bestpath=False, loglevel='FATAL')
for w,ph in [('newtons','N UW T AH N Z'),('torsional','T AO R SH AH N AH L'),('outstand','AW T S T AE N D')]:
    dec.add_word(w,ph,True); words_in_dict.add(w)
for i,(s,e,text) in enumerate(lines):
    toks=tokens(text)
    lw=[t.lower() for t in toks]
    oov=[w for w in lw if w not in words_in_dict]
    s0=max(0,s-0.15); e0=min(len(y)/sr, e+0.15 if e-s<6 else s+6)
    seg=(yv[int(s0*sr):int(e0*sr)]*32767*0.9/ (np.abs(yv[int(s0*sr):int(e0*sr)]).max()+1e-9)).astype(np.int16).tobytes()
    al=[w for w in lw if w in words_in_dict]
    try:
        dec.set_align_text(' '.join(al))
        dec.start_utt(); dec.process_raw(seg, full_utt=True); dec.end_utt()
        segs=[(sg.word, s0+sg.start_frame/100, s0+(sg.end_frame+1)/100) for sg in dec.seg() if sg.word not in ('<sil>','<s>','</s>','(NULL)','[NOISE]')]
    except Exception as ex:
        segs=[]; print('ERR',i,ex)
    res.append({'i':i,'start':s,'end':e,'text':text,'tokens':toks,'oov':oov,'segs':segs})
    print(f"{i:2d} {s:7.2f}-{e:7.2f} oov={oov} n={len(toks)} aligned={len(segs)}", ' '.join(f"{w}@{a:.2f}" for w,a,_ in segs[:8]))
json.dump(res,open('align_raw.json','w'),indent=1)
