# CI/CD avec GitHub Actions

ExploreIOT inclut un pipeline CI/CD automatisé pour la détection des vulnérabilités et les tests.

## Trivy Security Scanning

Les images Docker sont scannées avec **Trivy** pour les vulnérabilités connues avant le déploiement :

```yaml
# .github/workflows/security.yml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ env.TAG }}
    format: 'sarif'
    output: 'trivy-results.sarif'
```

Les rapports SARIF sont uploadés dans l'onglet "Security" de GitHub.

## Tests automatisés

Les tests frontend Vitest et backend pytest s'exécutent automatiquement à chaque push :

```bash
# Frontend
npm run test

# Backend
cd backend && python -m pytest
```

Tous les tests doivent passer avant que la PR ne soit fusionnée.

## Pipeline complet

Le workflow GitHub Actions (`.github/workflows/ci.yml`) exécute :

1. **Lint** — ESLint + TypeScript check
2. **Tests** — Vitest (frontend) + pytest (backend)
3. **Build** — Docker images multi-stage
4. **Scan** — Trivy vulnerability scanning

!!! tip "Voir aussi"
    - [Déployer avec Docker](deployer-docker.md) — guide de déploiement
    - [Modèle de sécurité](../explications/securite.md) — stratégie de sécurité
