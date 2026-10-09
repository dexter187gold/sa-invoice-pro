#!/usr/bin/env python3
"""Restore src/pages/Tickets.jsx from a zlib+base64 payload file."""
import base64, zlib, pathlib, sys

def main():
    payload = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'tickets_payload.b64')
    out = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else 'src/pages/Tickets.jsx')
    data = payload.read_text().strip()
    out.write_bytes(zlib.decompress(base64.b64decode(data)))
    print(f'Wrote {out} ({out.stat().st_size} bytes)')

if __name__ == '__main__':
    main()
