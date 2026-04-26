const PSEUDO_KEY = "userPseudo";

export function savePseudoToStorage(storage, pseudo) {
  storage.setItem(PSEUDO_KEY, String(pseudo ?? "").trim());
}

export function getPseudoFromStorage(storage) {
  return String(storage.getItem(PSEUDO_KEY) ?? "").trim();
}

