/**
 * LocalStorage-backed save system.
 */
export class SaveSystem {
  constructor() {
    this.storageKey = 'cup-escape-save';
  }

  /**
   * Save game state to LocalStorage.
   * @param {object} state
   */
  save(state) {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  /**
   * Load game state from LocalStorage.
   * @returns {object|null}
   */
  load() {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : null;
  }
}
