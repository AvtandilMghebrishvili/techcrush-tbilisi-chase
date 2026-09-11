"""Prepare the checked-in CC0 audio with Python 3 and FFmpeg (no Python packages).

Run from the repository root: python scripts/prepare-audio.py
Downloads are cached under ignored artifacts/audio-v13. Runtime files are PCM WAV.
"""
from pathlib import Path
import array
import hashlib
import json
import subprocess
import sys
import urllib.request
import wave
import zipfile

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'artifacts' / 'audio-v13'
OUTPUT = ROOT / 'dist' / 'assets' / 'audio'
CACHE.mkdir(parents=True, exist_ok=True)
OUTPUT.mkdir(parents=True, exist_ok=True)
SOURCES = {
    'engine-source.wav': 'https://opengameart.org/sites/default/files/loop_0.wav',
    'impacts.zip': 'https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip',
}
EXPECTED = {
    'engine-source.wav': '69d74b106509037ce547429e4c3f9ae906b0fffe88d0bb8b3b5a8b0cfc239048',
    'impacts.zip': '029d734af1582474edf3a694d1b0cebc97c1c152f2f39fa34d4c2bafc5de77f8',
}
for name, url in SOURCES.items():
    target = CACHE / name
    if not target.exists():
        request = urllib.request.Request(url, headers={'User-Agent': 'TECHCRUSH asset preparation'})
        with urllib.request.urlopen(request, timeout=60) as response:
            target.write_bytes(response.read())
    if hashlib.sha256(target.read_bytes()).hexdigest() != EXPECTED[name]:
        raise ValueError('Upstream asset differs from the reviewed CC0 input: ' + name)

FILES = {
    'engine-bed.wav': 'engine-source.wav',
    'metal-hit.wav': 'impactMetal_heavy_000.ogg',
    'metal-hit-2.wav': 'impactMetal_heavy_001.ogg',
    'wood-hit.wav': 'impactWood_heavy_000.ogg',
    'wood-hit-2.wav': 'impactWood_heavy_001.ogg',
    'wood-snap.wav': 'impactPlank_medium_000.ogg',
    'stone-hit.wav': 'impactMining_000.ogg',
    'glass-hit.wav': 'impactGlass_heavy_000.ogg',
}
with zipfile.ZipFile(CACHE / 'impacts.zip') as archive:
    for source in list(FILES.values())[1:]:
        member = next(n for n in archive.namelist() if n.endswith('/' + source))
        (CACHE / source).write_bytes(archive.read(member))

manifest = {
    'license': 'CC0-1.0',
    'engine': {'author': 'domasx2', 'page': 'https://opengameart.org/content/racing-car-engine-sound-loops'},
    'impacts': {'author': 'Kenney', 'page': 'https://kenney.nl/assets/impact-sounds', 'pack': 'Impact Sounds 1.0'},
    'downloads': [{'url': url, 'sha256': hashlib.sha256((CACHE / name).read_bytes()).hexdigest()} for name, url in SOURCES.items()],
    'processing': 'Mono 24 kHz PCM16; 35 Hz high-pass; leading silence removed from impacts; peak normalization; 40 ms engine loop crossfade and DC removal.',
    'files': [],
}
for name, source in FILES.items():
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(CACHE / source), '-ac', '1', '-ar', '24000',
                          '-af', 'highpass=f=35,lowpass=f=7000', '-f', 's16le', '-'], check=True, capture_output=True).stdout
    pcm = array.array('h', raw)
    if sys.byteorder != 'little':
        pcm.byteswap()
    samples = [x / 32768 for x in pcm]
    if name == 'engine-bed.wav':
        n = 960
        blend = [samples[-n+i] * (1-i/(n-1)) + samples[i] * i/(n-1) for i in range(n)]
        samples = samples[n:-n] + blend
        dc = sum(samples) / len(samples)
        samples = [x-dc for x in samples]
    else:
        start = next((i for i, x in enumerate(samples) if abs(x) > .001), 0)
        samples = samples[max(0, start-24):]
        # Preserve the recorded attack; only fade the final 12 ms to avoid a cut click.
        for i in range(min(288, len(samples))):
            samples[-1-i] *= i/288
    peak = max(abs(x) for x in samples)
    gain = (.72 if name == 'engine-bed.wav' else .82) / max(.001, peak)
    pcm = array.array('h', (round(x * gain * 32767) for x in samples))
    if sys.byteorder != 'little':
        pcm.byteswap()
    target = OUTPUT / name
    with wave.open(str(target), 'wb') as writer:
        writer.setparams((1, 2, 24000, 0, 'NONE', 'not compressed'))
        writer.writeframes(pcm.tobytes())
    manifest['files'].append({'file': name, 'source': source, 'seconds': round(len(samples)/24000, 4),
                              'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
(ROOT / 'data' / 'audio-sources.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8', newline='\n')
print(json.dumps({'files': len(FILES), 'bytes': sum(p.stat().st_size for p in OUTPUT.glob('*.wav'))}))
