# Spécification design — Plateforme collaborative temps réel (MVP)

## 1. Objectif
Construire une application web collaborative fonctionnant sur une seule machine avec :
- authentification par pseudo,
- chat multi-utilisateurs en temps réel,
- tableau de bord live via SSE,
- notifications push live,
- appel WebRTC 1-à-1 (audio/vidéo),
- persistance SQLite et classement d’activité.

## 2. Périmètre validé
- **Inclus (MVP)** : toutes les fonctionnalités obligatoires listées dans l’énoncé.
- **Exclus (phase ultérieure)** : bonus (partage d’écran, persistance différée avancée des notifications au-delà du MVP minimal demandé).
- **Choix techniques validés** : Node.js + Express + SQLite + frontend vanilla (HTML/CSS/JS), Socket.IO pour WebSocket, Chart.js pour graphiques.

## 3. Architecture
### 3.1 Vue d’ensemble
- Un **backend Node.js monolithique modulaire**.
- Un **frontend multi-pages vanilla** servi statiquement.
- Une base **SQLite** locale pour persistance.
- Deux canaux temps réel :
  - **Socket.IO** : chat, présence, notifications live, signalisation WebRTC.
  - **SSE** : flux de métriques CPU/RAM simulées.

### 3.2 Modules backend
- `auth` : login pseudo, règles pseudo réservé `admin`, statut utilisateur.
- `presence` : utilisateurs en ligne, connect/disconnect.
- `chat` : émission/réception des messages + historique.
- `notifications` : émission admin, diffusion live, historique.
- `dashboard` : simulation métriques, publication SSE.
- `webrtc-signaling` : relais `offer/answer/ice/hangup`.
- `stats` : calcul/incrément des activités et leaderboard.
- `db` : schéma, accès SQLite, requêtes paramétrées.

## 4. Modèle de données (SQLite)
### 4.1 Tables
- `users(id, pseudo UNIQUE, is_online, last_seen_at, created_at)`
- `messages(id, user_id, content, created_at)`
- `notifications(id, level, title, body, created_by_user_id, created_at)`
- `user_notifications(id, user_id, notification_id, delivered_at, read_at)`
- `video_sessions(id, initiator_user_id, target_user_id, started_at, ended_at, status)`
- `activity_counters(user_id PRIMARY KEY, messages_sent, alerts_received, video_sessions_started, updated_at)`
- `system_metrics(id, cpu_percent, ram_percent, created_at)` (historique court utile à la démo)

### 4.2 Règles
- `pseudo` non vide, longueur bornée, unicité logique en session.
- `admin` est un pseudo réservé à l’interface d’administration notifications.
- Chaque message/notification/session vidéo met à jour `activity_counters`.

## 5. Contrats API/temps réel
### 5.1 HTTP
- `POST /api/auth/login` `{ pseudo }` -> session utilisateur côté client.
- `POST /api/auth/logout`
- `GET /api/users/online`
- `GET /api/messages/history?limit=...`
- `GET /api/notifications/history?limit=...`
- `GET /api/stats/leaderboard`
- `GET /api/dashboard/stream` (SSE)

### 5.2 Socket.IO événements
- `presence:join`, `presence:leave`, `presence:update`
- `chat:send`, `chat:new`
- `notify:send` (admin only), `notify:new`
- `webrtc:call-request`, `webrtc:offer`, `webrtc:answer`, `webrtc:ice`, `webrtc:hangup`
- `error:event` (retour explicite en cas d’action invalide)

### 5.3 SSE
- Event `metrics` : `{ cpu, ram, ts }` toutes les X secondes.
- Event `threshold-alert` si CPU/RAM dépassent seuil configuré.

## 6. Flux fonctionnels
1. **Connexion**
   - Utilisateur saisit un pseudo.
   - Serveur valide et marque online.
   - Diffusion de la liste online à tous les clients.
2. **Chat**
   - Client émet `chat:send`.
   - Serveur valide/persiste/diffuse `chat:new`.
   - Historique chargé au chargement de la page.
3. **Dashboard**
   - Client ouvre SSE.
   - Reçoit données simulées, met à jour Chart.js.
   - Affiche alertes visuelles au dépassement de seuil.
4. **Notifications**
   - `admin` envoie notification (`info|warning|critical`).
   - Serveur persiste + push live.
   - Historique accessible aux connexions ultérieures.
5. **WebRTC 1-à-1**
   - A initie appel vers B.
   - Signalisation via Socket.IO.
   - Flux média direct navigateur-navigateur (P2P).
6. **Scores/activités**
   - Incrément sur événements métier.
   - Leaderboard disponible via API + affichage UI.

## 7. Frontend (pages)
- `index.html` : connexion pseudo.
- `chat.html` : chat + online users + notifications récentes.
- `dashboard.html` : graphiques CPU/RAM + alertes.
- `admin.html` : formulaire d’envoi notifications (accès pseudo `admin`).
- `call.html` : appel WebRTC 1-à-1 + mini chat textuel de session.
- `leaderboard` intégré à `chat.html` ou page dédiée.

## 8. Gestion d’erreurs (version légère)
- Validation simple des champs obligatoires (pseudo, message, niveau notification).
- Message d’erreur lisible côté client si action refusée (ex. notification non-admin).
- Gestion propre des déconnexions : passage offline + mise à jour présence.
- Arrêt d’appel WebRTC propre (`hangup`) si pair indisponible.
- Logs serveur simples orientés démo.

## 9. Sécurité (niveau cours, volontairement minimal)
- Requêtes SQL paramétrées (évite les injections évidentes).
- Échappement basique du texte affiché dans le chat/notifications.
- Contrôle d’accès minimal pour l’envoi admin des notifications.
- Pas d’auth forte ni durcissement avancé (hors scope du projet).

## 10. Validation attendue (démonstration)
- 2+ clients connectés, chat broadcast en direct.
- Dashboard SSE évolutif avec alertes visuelles.
- Notification `info/warning/critical` envoyée par admin et reçue instantanément.
- Appel WebRTC 1-à-1 établi et terminé proprement.
- Leaderboard cohérent après interactions.
- Redémarrage serveur : historique et compteurs conservés.

## 11. Découpage en sous-projets (ordre recommandé)
1. Socle projet + DB + auth/presence.
2. Chat temps réel + historique.
3. Dashboard SSE + Chart.js + seuils.
4. Notifications + panneau admin.
5. WebRTC 1-à-1 + signalisation.
6. Activité/leaderboard + finitions UX + doc d’installation/lancement.
