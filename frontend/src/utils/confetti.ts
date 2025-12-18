import confetti from 'canvas-confetti';

export function celebrateSuccess() {
  // Fire confetti from the left
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { x: 0.1, y: 0.6 },
    colors: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
  });

  // Fire confetti from the right
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { x: 0.9, y: 0.6 },
    colors: ['#22c55e', '#4ade80', '#86efac', '#bbf7d0'],
  });
}

export function fireworksEffect() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Fire from random positions
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
}

export function starBurst() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    scalar: 0.8,
    colors: ['#FFE400'],
  });
  fire(0.2, {
    spread: 60,
    colors: ['#FFE400', '#FFBD00'],
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    colors: ['#F9F871', '#FF6B6B'],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: ['#FF6B6B', '#4ECDC4'],
  });
}

export function schedulePublishedCelebration() {
  // Special celebration for schedule publishing
  const end = Date.now() + 2000;

  const colors = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors,
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}
