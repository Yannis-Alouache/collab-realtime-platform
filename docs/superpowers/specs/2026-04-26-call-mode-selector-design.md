# Spécification design — Sélecteur mode d’appel WebRTC

## Objectif
Permettre à l’utilisateur de choisir explicitement le mode d’appel (`audio seul` ou `audio + vidéo`) avant de lancer un appel.

## Périmètre
- `public/call.html`: ajout d’un sélecteur de mode.
- `public/js/call.js`: blocage tant que mode non choisi + propagation du mode.
- `public/js/media.js`: acquisition média pilotée par le mode.

## Comportement UI
- Ajouter un `<select id="callMode">` avec :
  - `""` => `Choisir un mode...`
  - `audio-only` => `Audio seul`
  - `audio-video` => `Audio + Vidéo`
- État initial : `callMode=""` et bouton `Appeler` désactivé.
- Le bouton devient cliquable uniquement quand un mode valide est sélectionné.

## Règles fonctionnelles
- Si mode vide, `startCall()` bloque et affiche un message explicite.
- `audio-only` : acquisition `{ audio: true, video: false }`.
- `audio-video` : tentative `{ audio: true, video: true }`, fallback vers `audio-only` si indisponible.
- Le même mode local est utilisé pour établir la session WebRTC.

## Robustesse
- Conserver `console.error` + `alert` en cas d’échec de démarrage d’appel.
- Ne pas modifier le protocole Socket.IO (`offer/answer/ice`) existant.

## Validation attendue
1. Page ouverte -> `Appeler` est grisé.
2. Sélection `Audio seul` -> `Appeler` actif et appel démarre en audio.
3. Sélection `Audio + Vidéo` -> appel démarre en audio+vidéo ou fallback audio si caméra indisponible.
4. Aucun crash JS non géré sur clic `Appeler`.

