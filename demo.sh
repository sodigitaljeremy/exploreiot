#!/usr/bin/env bash
# demo.sh — Lance tout le backend ExploreIOT en une commande
# Usage : ./demo.sh
# Ctrl+C pour tout arreter proprement

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ─── Couleurs ──────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[demo]${NC} $*"; }
warn() { echo -e "${YELLOW}[demo]${NC} $*"; }
err()  { echo -e "${RED}[demo]${NC} $*"; }

# ─── PIDs a nettoyer ──────────────────────────────────────
API_PID=""
SUB_PID=""
PUB_PID=""

cleanup() {
    echo ""
    log "Arret en cours..."
    [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null && log "API arretee"
    [ -n "$SUB_PID" ] && kill "$SUB_PID" 2>/dev/null && log "Subscriber arrete"
    [ -n "$PUB_PID" ] && kill "$PUB_PID" 2>/dev/null && log "Publisher arrete"
    log "Arret des conteneurs Docker..."
    docker compose down 2>/dev/null
    log "Tout est propre. A bientot !"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ─── Charger les variables d'environnement ────────────────
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
    log "Variables chargees depuis .env"
elif [ -f "$SCRIPT_DIR/.env.example" ]; then
    set -a
    source "$SCRIPT_DIR/.env.example"
    set +a
    warn "Pas de .env trouve, utilisation des valeurs par defaut (.env.example)"
else
    err "Ni .env ni .env.example trouve. Creez un fichier .env."
    exit 1
fi

# Variables avec valeurs par defaut pour le mode local (demo)
: "${DB_HOST:=localhost}"
: "${DB_PORT:=5434}"
: "${DB_NAME:=exploreiot}"
: "${DB_USER:=exploreiot}"
: "${DB_PASSWORD:=change_me_in_production}"
: "${MQTT_HOST:=localhost}"
: "${MQTT_PORT:=1883}"
: "${MQTT_USER:=exploreiot}"
: "${MQTT_PASSWORD:=exploreiot_mqtt}"
: "${CORS_ORIGIN:=http://localhost:3000}"

# Override pour le mode local (demo lance les services sur localhost)
DB_HOST=localhost
DB_PORT=5434
MQTT_HOST=localhost

# ─── Verifications ────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    err "Docker n'est pas installe. Installez Docker pour utiliser ce script."
    exit 1
fi

if ! docker compose version &>/dev/null; then
    err "Docker Compose n'est pas disponible."
    exit 1
fi

if ! command -v python3 &>/dev/null; then
    err "Python 3 n'est pas installe."
    exit 1
fi

# ─── 1. Infrastructure Docker ─────────────────────────────
log "Demarrage de PostgreSQL et Mosquitto..."
docker compose up -d postgres mosquitto 2>&1 | grep -v "^$"

log "Attente que les services soient prets..."
RETRIES=0
MAX_RETRIES=30
while [ $RETRIES -lt $MAX_RETRIES ]; do
    PG_OK=$(docker compose ps postgres --format json 2>/dev/null | grep -c '"healthy"' || true)
    MQ_OK=$(docker compose ps mosquitto --format json 2>/dev/null | grep -c '"healthy"' || true)
    if [ "$PG_OK" -ge 1 ] && [ "$MQ_OK" -ge 1 ]; then
        break
    fi
    RETRIES=$((RETRIES + 1))
    sleep 2
    printf "."
done
echo ""

if [ $RETRIES -ge $MAX_RETRIES ]; then
    warn "Les services mettent du temps a demarrer. Tentative de continuer..."
else
    log "PostgreSQL et Mosquitto sont prets"
fi

# ─── 2. API FastAPI ───────────────────────────────────────
log "Demarrage de l'API FastAPI sur http://localhost:8000 ..."
cd "$SCRIPT_DIR/backend"

DB_HOST="$DB_HOST" \
DB_PORT="$DB_PORT" \
DB_NAME="$DB_NAME" \
DB_USER="$DB_USER" \
DB_PASSWORD="$DB_PASSWORD" \
MQTT_HOST="$MQTT_HOST" \
MQTT_PORT="$MQTT_PORT" \
MQTT_USER="$MQTT_USER" \
MQTT_PASSWORD="$MQTT_PASSWORD" \
CORS_ORIGIN="$CORS_ORIGIN" \
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
API_PID=$!
sleep 2

# Verification rapide
if kill -0 "$API_PID" 2>/dev/null; then
    log "API demarree (PID $API_PID)"
else
    err "L'API n'a pas demarre. Verifiez les logs ci-dessus."
    cleanup
fi

# ─── 3. Subscriber (MQTT → PostgreSQL) ──────────────────
log "Demarrage du subscriber (MQTT → PostgreSQL)..."

DB_HOST="$DB_HOST" \
DB_PORT="$DB_PORT" \
DB_NAME="$DB_NAME" \
DB_USER="$DB_USER" \
DB_PASSWORD="$DB_PASSWORD" \
MQTT_HOST="$MQTT_HOST" \
MQTT_PORT="$MQTT_PORT" \
MQTT_USER="$MQTT_USER" \
MQTT_PASSWORD="$MQTT_PASSWORD" \
python3 subscriber.py &
SUB_PID=$!
sleep 1

if kill -0 "$SUB_PID" 2>/dev/null; then
    log "Subscriber demarre (PID $SUB_PID)"
else
    warn "Le subscriber n'a pas demarre."
fi

# ─── 4. Publisher (simulateur de capteurs) ────────────────
log "Demarrage du publisher (capteurs simules)..."

MQTT_HOST="$MQTT_HOST" \
MQTT_PORT="$MQTT_PORT" \
MQTT_USER="$MQTT_USER" \
MQTT_PASSWORD="$MQTT_PASSWORD" \
python3 publisher.py &
PUB_PID=$!
sleep 1

if kill -0 "$PUB_PID" 2>/dev/null; then
    log "Publisher demarre (PID $PUB_PID)"
else
    warn "Le publisher n'a pas demarre (MQTT peut-etre pas encore pret)."
fi

cd "$SCRIPT_DIR"

# ─── Recap ────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}ExploreIOT Backend — Tout est lance !${NC}          ${CYAN}║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC}                                                  ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  PostgreSQL   ${GREEN}●${NC}  localhost:5434                  ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  Mosquitto    ${GREEN}●${NC}  localhost:1883                  ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  API FastAPI  ${GREEN}●${NC}  http://localhost:8000           ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  Subscriber   ${GREEN}●${NC}  MQTT → PostgreSQL              ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  Publisher    ${GREEN}●${NC}  Envoi toutes les 5s             ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                                                  ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${YELLOW}→ Ouvrez http://localhost:3000${NC}                  ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${YELLOW}→ Cliquez sur le toggle \"API\" dans la navbar${NC}  ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                                                  ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  Ctrl+C pour tout arreter                        ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ─── Attente (garder le script actif pour le trap) ────────
wait
