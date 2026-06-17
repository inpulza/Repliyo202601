#!/usr/bin/env bash
# Trae los últimos cambios de GitHub a Replit, limpiando locks colgados.
# Uso:  bash pull.sh
rm -f .git/*.lock .git/refs/heads/*.lock 2>/dev/null || true
git pull origin main --no-edit
echo ""
echo "✅ Listo — tu copia en Replit está al día con GitHub."
