/**
 * Achievement tracking service.
 */
export class AchievementSystem {
  constructor(saveSystem) {
    this.saveSystem = saveSystem;
    this.achievements = new Set();
  }

  /**
   * Unlock an achievement by key.
   * @param {string} key
   */
  unlock(key) {
    if (!this.achievements.has(key)) {
      this.achievements.add(key);
      this.saveSystem.save({ achievements: Array.from(this.achievements) });
    }
  }
}
