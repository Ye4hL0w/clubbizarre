#!/bin/bash
# Double-cliquer ce fichier dans le Finder : lance le site en local
# (http://localhost:5175, rechargement automatique) et l'ouvre dans le navigateur.
cd "$(dirname "$0")/.." || exit 1
# Node peut être installé via Homebrew ou nvm : on l'ajoute au PATH si besoin
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
(sleep 1 && open "http://localhost:5175") &
exec node scripts/dev-server.mjs 5175
