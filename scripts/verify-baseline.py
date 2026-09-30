"""Verify unchanged model/store without publishing the private workspace archive."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'scripts/baseline-checksums.json').read_text())
for name, expected in manifest['production_files'].items():
    actual = hashlib.sha256((root / name).read_bytes()).hexdigest()
    assert actual == expected, name + ' differs from the original ZIP'
print(f"{len(manifest['production_files'])} production model/store files match the original ZIP hashes.")
