"""Rebuild the small browser classifier from Google's CC BY 4.0 Quick, Draw! bitmaps.
Run with OPENBLAS_NUM_THREADS=2 python scripts/draw-it/train.py from the repository root.
Requires numpy, scipy, scikit-learn, and Pillow. Only model weights ship.
"""
import ast
import base64
import json
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import quote

import numpy as np
from urllib.request import Request, urlopen
from urllib.error import URLError
from PIL import Image
from scipy.special import softmax
from sklearn.neural_network import MLPClassifier

LABELS = sorted("airplane,apple,banana,baseball bat,basketball,bed,bicycle,bird,book,bowtie,butterfly,cake,camera,candle,car,carrot,cat,chair,circle,clock,cloud,crown,cup,dog,door,ear,elephant,envelope,eye,eyeglasses,fish,flower,foot,fork,frog,giraffe,grapes,guitar,hammer,hand,hat,headphones,hedgehog,helicopter,hexagon,horse,hot dog,house,ice cream,key,ladder,leaf,light bulb,lightning,lollipop,moon,mountain,mushroom,pencil,pizza,rainbow,sailboat,scissors,shark,shoe,smiley face,snake,snowflake,snowman,sock,spider,spoon,square,star,strawberry,sun,sword,t-shirt,tent,train,tree,triangle,truck,umbrella,watermelon,whale,wheel,wristwatch".split(","))
SIDE = 20
COUNT = 1800
TRAIN = 1650
CACHE = Path(tempfile.gettempdir()) / f"avk-quickdraw-bitmaps-{COUNT}"
CACHE.mkdir(exist_ok=True)

def examples(label):
    target = CACHE / (label + ".npy")
    if not target.exists():
        url = "https://storage.googleapis.com/quickdraw_dataset/full/numpy_bitmap/" + quote(label) + ".npy"
        end = 784 * COUNT + 255
        for attempt in range(3):
            try:
                with urlopen(Request(url, headers={"Range": f"bytes=0-{end}"}), timeout=40) as response:
                    raw = response.read(end + 1)
                offset = 10 + int.from_bytes(raw[8:10], "little")
                assert raw[:6] == b"\x93NUMPY" and ast.literal_eval(raw[10:offset].decode())["descr"] == "|u1"
                pictures = np.frombuffer(raw[offset:offset+784*COUNT], dtype=np.uint8).reshape(COUNT,28,28)
                np.save(target, pictures)
                break
            except (URLError, ValueError, AssertionError):
                if attempt == 2:
                    raise
    processed = []
    for a in np.load(target):
        im = Image.fromarray(a)
        box = im.getbbox()
        crop = im.crop(box) if box else im
        scale = (SIDE-2) / max(crop.size)
        crop = crop.resize(tuple(max(1, round(n*scale)) for n in crop.size), Image.Resampling.BILINEAR)
        cell = Image.new("L",(SIDE,SIDE))
        cell.paste(crop,((SIDE-crop.width)//2,(SIDE-crop.height)//2))
        processed.append(np.asarray(cell).reshape(-1))
    return np.asarray(processed)

def quantize(a):
    scale = float(np.max(np.abs(a)) / 127) or 1
    values = np.round(a / scale).astype(np.int8)
    return {"scale":scale,"bytes":base64.b64encode(values.tobytes()).decode()}

def main():
    with ThreadPoolExecutor(max_workers=10) as pool:
        batches = list(pool.map(examples,LABELS))
    x = np.concatenate([b[:TRAIN] for b in batches]).astype("float32") / 255
    y = np.repeat(np.arange(len(LABELS)),TRAIN)
    net = MLPClassifier(hidden_layer_sizes=(144,),batch_size=256,max_iter=44,early_stopping=True,
                        validation_fraction=.07,n_iter_no_change=5,random_state=41)
    net.fit(x,y)
    weights = [quantize(w) for w in net.coefs_]
    w1,w2 = [np.frombuffer(base64.b64decode(w["bytes"]),dtype=np.int8).reshape(orig.shape)*w["scale"]
             for w,orig in zip(weights,net.coefs_)]
    test = np.concatenate([b[TRAIN:] for b in batches]).astype("float32") / 255
    preds = softmax(np.maximum(0,test@w1+net.intercepts_[0])@w2+net.intercepts_[1],axis=1)
    top = np.sort(preds,axis=1)[:,-2:]
    keep = (top[:,1]>=.67) & ((top[:,1]-top[:,0])>=.38)
    right = preds.argmax(axis=1)==np.repeat(np.arange(len(LABELS)),COUNT-TRAIN)
    print(f"{len(test)} held out, top-1 {right.mean():.3f}, accepted {keep.mean():.3f}, correct among accepted {right[keep].mean():.3f}")
    model = {"labels":LABELS,"side":SIDE,"weights":weights,"biases":[b.tolist() for b in net.intercepts_],
             "credit":"Trained on Google Quick, Draw! drawings (CC BY 4.0); see docs/draw-it.md."}
    Path("public/assets/draw-it/doodle-model-v1.json").write_text(json.dumps(model,separators=(",",":"))+"\n")

if __name__ == "__main__":
    main()
