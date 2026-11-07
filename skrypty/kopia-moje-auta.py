#!/usr/bin/env python3
"""Kopia Moich aut z Supabase do folderu (np. sejf na T7): tabele jako JSON i wszystkie pliki ze schowka.
Użycie: python3 skrypty/kopia-moje-auta.py <folder>. Klucz serwisowy pobiera Supabase CLI; nigdzie go nie zapisuje ani nie wypisuje.
Pliki już skopiowane zostają (nic nie jest kasowane), więc zdjęcia usunięte w panelu dalej są w kopii."""
import json, os, subprocess, sys, urllib.request

REF = 'dvtnbsztbdpqbeigbgdp'
URL = f'https://{REF}.supabase.co'
cel = sys.argv[1]
klucze = json.loads(subprocess.run(['npx', '-y', 'supabase@latest', 'projects', 'api-keys', '--project-ref', REF, '-o', 'json'],
                                   capture_output=True, text=True, check=True).stdout)
KLUCZ = next(k['api_key'] for k in klucze if k.get('name') == 'service_role')
NAGL = {'apikey': KLUCZ, 'Authorization': f'Bearer {KLUCZ}'}

def pobierz(sciezka, dane=None):
    req = urllib.request.Request(URL + sciezka, data=json.dumps(dane).encode() if dane else None,
                                 headers={**NAGL, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

os.makedirs(os.path.join(cel, 'pliki'), exist_ok=True)
for t in ('moje_auta', 'koszty', 'zdjecia'):
    with open(os.path.join(cel, f'{t}.json'), 'wb') as f:
        f.write(pobierz(f'/rest/v1/{t}?select=*'))
zdjecia = json.loads(open(os.path.join(cel, 'zdjecia.json'), 'rb').read())
nowe = 0
for z in zdjecia:
    plik = os.path.join(cel, 'pliki', z['sciezka'])
    if os.path.exists(plik):
        continue
    os.makedirs(os.path.dirname(plik), exist_ok=True)
    with open(plik, 'wb') as f:
        f.write(pobierz(f"/storage/v1/object/moje-auta/{z['sciezka']}"))
    nowe += 1
auta = json.loads(open(os.path.join(cel, 'moje_auta.json'), 'rb').read())
print(f'Moje auta: {len(auta)} aut, {len(zdjecia)} plików w bazie, {nowe} nowych skopiowanych')
