#!/bin/sh
# Ustawia (albo zmienia) wspólne hasło do panelu. Uruchamia właściciel w terminalu.
# Hasło wpisuje się bez podglądu; nie trafia do pliku, historii ani na ekran.
set -eu
REF=dvtnbsztbdpqbeigbgdp
URL="https://$REF.supabase.co"
EMAIL="panel@autoradar.app"   # stały adres konta panelu, nikt go nie wpisuje

KLUCZ=$(npx -y supabase@latest projects api-keys --project-ref "$REF" -o json 2>/dev/null | python3 -c "import json,sys; print(next(k['api_key'] for k in json.load(sys.stdin) if k.get('name')=='service_role'))")

printf "Nowe hasło do panelu (min. 8 znaków): "; stty -echo; read -r H1; stty echo; echo
printf "Powtórz hasło: "; stty -echo; read -r H2; stty echo; echo
[ "$H1" = "$H2" ] || { echo "Hasła się różnią. Nic nie zmieniono."; exit 1; }
[ ${#H1} -ge 8 ] || { echo "Za krótkie. Nic nie zmieniono."; exit 1; }

ID=$(curl -s "$URL/auth/v1/admin/users?per_page=50" -H "apikey: $KLUCZ" -H "Authorization: Bearer $KLUCZ" | python3 -c "import json,sys; print(next((u['id'] for u in json.load(sys.stdin).get('users',[]) if u.get('email')=='$EMAIL'),''))")

if [ -z "$ID" ]; then
  METODA=POST; ADRES="$URL/auth/v1/admin/users"
else
  METODA=PUT; ADRES="$URL/auth/v1/admin/users/$ID"
fi
KOD=$(H="$H1" python3 -c "import json,os; print(json.dumps({'email':'$EMAIL','password':os.environ['H'],'email_confirm':True}))" | \
  curl -s -o /dev/null -w '%{http_code}' -X "$METODA" "$ADRES" -H "apikey: $KLUCZ" -H "Authorization: Bearer $KLUCZ" -H "Content-Type: application/json" --data @-)
unset H1 H2
[ "$KOD" = "200" ] && echo "GOTOWE: hasło ustawione." || { echo "Błąd ($KOD). Nic nie zmieniono."; exit 1; }
