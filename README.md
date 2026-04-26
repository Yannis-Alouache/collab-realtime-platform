# Plateforme collaborative en temps réel

Application web de projet final avec :
- chat multi-utilisateurs (WebSocket),
- dashboard système live (SSE + Chart.js),
- notifications push en direct (WebSocket),
- appel WebRTC audio/vidéo 1-à-1,
- persistance SQLite + leaderboard d’activité.

## Prérequis
- Node.js 20+

## Installation
```bash
npm install
```

## Lancement
```bash
npm start
```

Application disponible sur `http://localhost:3000`.

## Modules
- `server/app.js` : API REST + Socket.IO + SSE.
- `server/db/*` : schéma et persistance SQLite (`data/app.sqlite`).
- `public/*` : pages frontend vanilla.

## Appel WebRTC
- Le mode d'appel est obligatoire : `Audio seul` ou `Audio + Vidéo`.
- Le bouton `Appeler` reste désactivé tant qu'aucun mode n'est sélectionné.
- En mode `Audio + Vidéo`, l'application bascule automatiquement en audio seul si la caméra est indisponible.

## Démo rapide
1. Ouvrir deux navigateurs et se connecter avec deux pseudos différents sur `/`.
2. Tester le chat en direct sur `/chat.html`.
3. Ouvrir `/dashboard.html` pour voir CPU/RAM simulés.
4. Se connecter admin via `/` puis envoyer notifications depuis `/admin.html`.
5. Démarrer un appel entre deux utilisateurs via `/call.html`.
6. Vérifier le leaderboard (messages, alertes, sessions) dans le chat.

