# Spécification design — Ajustement seuils d’alerte dashboard

## Objectif
Réduire la fréquence des alertes visuelles CPU/RAM sur le dashboard en relevant les seuils.

## Périmètre
- Changement ciblé de configuration uniquement.
- Aucun changement UI, API, SSE, ou structure de données.

## Décision
- `cpuAlertThreshold`: `80` -> `90`
- `ramAlertThreshold`: `80` -> `90`

## Fichier impacté
- `server/config.js`

## Impact attendu
- Les événements `threshold-alert` sont émis moins tôt.
- Le comportement temps réel reste identique en dehors du seuil.

