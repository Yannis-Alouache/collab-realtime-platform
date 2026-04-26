export function createPresenceRegistry() {
  const socketsByPseudo = new Map();

  return {
    connect(pseudo, socketId) {
      const existing = socketsByPseudo.get(pseudo) ?? new Set();
      existing.add(socketId);
      socketsByPseudo.set(pseudo, existing);
    },
    disconnect(pseudo, socketId) {
      const existing = socketsByPseudo.get(pseudo);
      if (!existing) return;
      existing.delete(socketId);
      if (existing.size === 0) {
        socketsByPseudo.delete(pseudo);
      }
    },
    isOnline(pseudo) {
      const existing = socketsByPseudo.get(pseudo);
      return Boolean(existing && existing.size > 0);
    },
    getAnySocketId(pseudo) {
      const existing = socketsByPseudo.get(pseudo);
      if (!existing || existing.size === 0) return null;
      return [...existing][0];
    }
  };
}

