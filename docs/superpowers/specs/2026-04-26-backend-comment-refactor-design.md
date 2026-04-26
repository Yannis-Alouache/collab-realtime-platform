# Spécification design — Commentaires + refacto légère backend

## Objectif
Rendre le backend plus lisible pour les livrables en :
1) ajoutant des commentaires sur la majorité des fonctions backend,
2) faisant une refacto légère par extraction modulaire,
sans changer le comportement applicatif.

## Périmètre
- Inclus :
  - `server/app.js`
  - `server/db/client.js`
  - nouveaux modules backend extraits de `app.js`
- Exclu :
  - changements frontend
  - nouvelles fonctionnalités
  - changement schéma DB

## Architecture cible
- `server/app.js` : bootstrap Express + assemblage des modules.
- `server/routes/http-routes.js` : routes REST.
- `server/realtime/socket-handlers.js` : gestion des événements Socket.IO.
- `server/dashboard/metrics-stream.js` : génération et diffusion métriques SSE.
- `server/db/client.js` : accès DB central, conservé mais documenté.

## Politique de commentaires
- Commenter la majorité des fonctions backend.
- Commentaires orientés rôle/flux (“quoi/pourquoi”), pas paraphrase ligne-à-ligne.
- Commenter explicitement les flux critiques :
  - authentification pseudo,
  - présence connectés,
  - signalisation WebRTC,
  - streaming SSE.

## Contraintes de non-régression
- Endpoints HTTP inchangés (chemins, statuts, payloads).
- Événements Socket.IO inchangés (noms, payloads principaux).
- Schéma SQLite inchangé.
- Tests existants doivent continuer à passer.

## Validation attendue
1. Code backend split en modules ciblés, plus lisible.
2. Commentaires présents sur la majorité des fonctions backend.
3. Comportement fonctionnel identique côté utilisateur.
4. Suite de tests actuelle au vert.

