# Audit Logging

## Principe

Chaque requête HTTP reçue par l'API FastAPI est loguée par le middleware `AuditMiddleware`. Ce mécanisme permet de tracer l'activité du service pour le debugging et le monitoring.

## Implémentation

Le middleware est défini dans `backend/app/audit.py` :

```python
class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.monotonic()
        response = await call_next(request)
        duration = round((time.monotonic() - start) * 1000, 1)
        logger.info(
            "%s %s %s %sms",
            request.method,
            request.url.path,
            response.status_code,
            duration,
        )
        return response
```

## Format de log

```text
2026-04-12 10:23:45 | INFO     | app.audit | GET /health 200 2.3ms
2026-04-12 10:23:50 | INFO     | app.audit | GET /devices 200 15.7ms
2026-04-12 10:23:50 | INFO     | app.audit | GET /stats 200 8.1ms
2026-04-12 10:23:55 | INFO     | app.audit | GET /alerts 200 12.4ms
2026-04-12 10:24:00 | INFO     | app.audit | GET /devices/invalid/metrics 400 1.1ms
```

## Champs loggés

| Champ | Source | Exemple |
|-------|--------|---------|
| Méthode HTTP | `request.method` | `GET` |
| Chemin | `request.url.path` | `/devices` |
| Code statut | `response.status_code` | `200` |
| Durée | `time.monotonic()` delta | `15.7ms` |

## Configuration

Le format de log est défini dans `app/logging_config.py` :

```python
logging.basicConfig(
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
```

Le middleware est enregistré dans `app/main.py` :

```python
app.add_middleware(AuditMiddleware)
```

## Consultation des logs

```bash
# Tous les logs du backend
docker compose logs -f api

# Filtrer les requêtes lentes (> 100ms)
docker compose logs api | grep -E "[0-9]{3,}\.[0-9]ms"

# Filtrer les erreurs (4xx, 5xx)
docker compose logs api | grep -E " [45][0-9]{2} "
```
