const formatTokens = (value) => `${Number(value).toFixed(2)} tokens`;

const toggleModal = (modal, visible) => {
  modal.classList.toggle("visible", visible);
};

const getTierProgressPercent = ({ xp, tiers }) => {
  const currentIndex = tiers.findIndex((tier, index) => {
    const nextTier = tiers[index + 1];
    return xp >= tier.minXp && (!nextTier || xp < nextTier.minXp);
  });
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const currentTier = tiers[safeIndex];
  const nextTier = tiers[safeIndex + 1];
  if (!nextTier) {
    return 100;
  }
  const span = nextTier.minXp - currentTier.minXp;
  const progress = xp - currentTier.minXp;
  return Math.max(0, Math.min(100, Math.round((progress / span) * 100)));
};

class AudioEngine {
  constructor() {
    this.context = null;
    this.ambientNode = null;
    this.enabled = false;
    this.profile = null;
  }

  setProfile(profile) {
    this.profile = profile;
  }

  ensureContext() {
    if (!this.context) {
      this.context = new AudioContext();
    }
    return this.context;
  }

  playNearMissTone() {
    if (!this.profile) {
      return;
    }
    const context = this.ensureContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(this.profile.nearMissStartHz, context.currentTime);
    oscillator.frequency.linearRampToValueAtTime(
      this.profile.nearMissEndHz,
      context.currentTime + this.profile.nearMissDurationSec
    );
    gain.gain.setValueAtTime(this.profile.gainFloor, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      this.profile.nearMissGainPeak,
      context.currentTime + this.profile.nearMissAttackSec
    );
    gain.gain.exponentialRampToValueAtTime(
      this.profile.gainFloor,
      context.currentTime + this.profile.nearMissDurationSec
    );
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + this.profile.nearMissDurationSec + this.profile.noteTailSec);
  }

  playWinFanfare(winAmount) {
    if (!this.profile) {
      return;
    }
    const context = this.ensureContext();
    const baseGain = Math.max(
      this.profile.winGainMin,
      Math.min(this.profile.winGainMax, winAmount / this.profile.winGainDivisor)
    );
    const frequencies = this.profile.winFanfareNotes;
    frequencies.forEach((frequency, index) => {
      const offset = index * this.profile.noteStaggerSec;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + offset);
      gain.gain.setValueAtTime(this.profile.gainFloor, context.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(
        baseGain,
        context.currentTime + offset + this.profile.noteAttackSec
      );
      gain.gain.exponentialRampToValueAtTime(
        this.profile.gainFloor,
        context.currentTime + offset + this.profile.noteDecaySec
      );
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + offset);
      oscillator.stop(context.currentTime + offset + this.profile.noteDecaySec + this.profile.noteTailSec);
    });
  }

  setAmbient(enabled) {
    if (!this.profile) {
      return;
    }
    const context = this.ensureContext();
    this.enabled = enabled;
    if (!enabled && this.ambientNode) {
      this.ambientNode.stop();
      this.ambientNode.disconnect();
      this.ambientNode = null;
      return;
    }
    if (enabled && !this.ambientNode) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(this.profile.ambientHz, context.currentTime);
      gain.gain.setValueAtTime(this.profile.ambientGain, context.currentTime);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      this.ambientNode = oscillator;
    }
  }
}

const buildPaytableMarkup = (symbols) =>
  symbols
    .map((symbol) => {
      const payoutText = Object.entries(symbol.payout)
        .map(([matches, multiplier]) => `${matches}: ${multiplier}x`)
        .join(" | ");
      return `<div class="paytable-row"><span>${symbol.emoji} ${symbol.label}</span><span>${payoutText}</span></div>`;
    })
    .join("");

const updateDashboard = ({ state, config, elements }) => {
  elements.balanceValue.textContent = formatTokens(state.balance);
  elements.jackpotValue.textContent = formatTokens(state.jackpotPool);
  elements.freeSpinsValue.textContent = `${state.freeSpinsRemaining}`;
  elements.sessionSpend.textContent = `Session Spend: ${Number(state.sessionSpend).toFixed(2)} tokens`;
  elements.xpLabel.textContent = `XP ${state.xp}`;
  const progress = getTierProgressPercent({ xp: state.xp, tiers: config.game.xpTiers });
  elements.xpFill.style.width = `${progress}%`;
  elements.tierBadge.textContent = state.tier;
};

export { AudioEngine, toggleModal, buildPaytableMarkup, updateDashboard, formatTokens };
