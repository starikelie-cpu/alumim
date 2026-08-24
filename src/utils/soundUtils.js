// Web Audio API gentle click sound generator
let audioCtx = null;

export function playClickSound() {
    try {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            audioCtx = new AudioContextClass();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        // High frequency sine sweep down for a crisp, subtle, gentle "tick" sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.035);

        // Very quick, gentle envelope
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.035);
    } catch (e) {
        // Silently catch audio errors (e.g. if audio policy blocks prior to gesture)
    }
}

// Global listener setup for button click sounds
export function initButtonClickSound() {
    if (typeof window === 'undefined') return;

    window.addEventListener('pointerdown', (e) => {
        const target = e.target;
        if (!target) return;
        const clickable = target.closest('button, .ant-btn, .ant-select-selector, [role="button"], a.ant-btn');
        if (clickable && !clickable.disabled && !clickable.classList.contains('ant-btn-disabled')) {
            playClickSound();
        }
    }, { passive: true });
}
