import { useCallback, useRef, useEffect } from 'react';

// Sound effect URLs (using base64 encoded short sounds for reliability)
const SOUNDS = {
  success: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6YjHx0dH6MnKGdlIZ4cHV/j5+hn5WIenJzfYycoZ+Xi3x0c32LnKGfl4t9dXR8ipqfnpaLfnZ1fImZnp2VjH94eHyImJuak4t/e3t7hpWZl5KKgn58fISSlpWRiYOAf4GDkZSSkIeEgoGBgpCSkY+GhYOCgoKQkZCOhoaEhIOEj5CQjoaGhoWFho+QkI6HhoaGhoeOj4+OiIeHh4eIjo+Pj4mIiIiIio6Pj4+KiYmJiouOj4+PjImKiouMjo+Pj4yLi4uMjY6Pj4+NjIyMjY2Oj4+PjY2NjY6Ojo+PjY2NjY6Ojo6OjY6OjY6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6O',
  error: 'data:audio/wav;base64,UklGRl9CAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YTtCAAD/fwCAAwD9/wKAAID9/wOAAYD8/wSAAoD7/wWAA4D6/waABID5/weABYD4/wiABoD3/wmAB4D2/wqACID1/wuACYD0/wyACoD',
  notification: 'data:audio/wav;base64,UklGRpQFAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YXAFAABkAGQAZABkAGQAZABkAGQAZABkAJYAyAD6ACwBXgGQAcIB9AEmAlgCigK8Au4CIANSAwQEvgR4BTIGLAcmCCAJGgoUCw4MCA0CDvwO9g/wEOoR5BLeE9gU0hXMFsYXwBi6G7QcrB2kHpwflCCMIYQifCN0JGwlZCZcJ1QoTClEKjwrNCs0KzQrNCs0KzQrNCs0KzQrNCs0KzQrNCs0KywsJC0cLhQvDDAEMfwx9DLsM+Q03DXUNsw3xDi8Obk=',
  click: 'data:audio/wav;base64,UklGRhwFAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YfgEAAB4eHh4eHh4eHh4eHh4eHh4eHhwcGhoYGBYWFBQSEhAQDg4MDAoKCAoMDhASFBYYGhwgIiQmKCosLi4wMjQ2ODo8Pj4+Pj4+Pj48PDo4NjQyMi4sKigmJCIgHhwaGBYUEhAODAwKCggICAgKDA4QEhYYHCImLC4wMjY4Oj4+Pj4+Pj4+PDw6OjY0MjIuLCooJiQkIB4eHBoaGBgWFhYWFhYWFhYWFhYWFhYWA==',
};

type SoundType = keyof typeof SOUNDS;

interface SoundEffectsOptions {
  enabled?: boolean;
  volume?: number;
}

export function useSoundEffects(options: SoundEffectsOptions = {}) {
  const { enabled = true, volume = 0.3 } = options;
  const audioRefs = useRef<Map<SoundType, HTMLAudioElement>>(new Map());

  useEffect(() => {
    // Preload sounds
    Object.entries(SOUNDS).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.volume = volume;
      audio.preload = 'auto';
      audioRefs.current.set(key as SoundType, audio);
    });

    return () => {
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
    };
  }, [volume]);

  const play = useCallback(
    (sound: SoundType) => {
      if (!enabled) return;

      const audio = audioRefs.current.get(sound);
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {
          // Ignore errors (e.g., user hasn't interacted with page yet)
        });
      }
    },
    [enabled]
  );

  const playSuccess = useCallback(() => play('success'), [play]);
  const playError = useCallback(() => play('error'), [play]);
  const playNotification = useCallback(() => play('notification'), [play]);
  const playClick = useCallback(() => play('click'), [play]);

  return {
    play,
    playSuccess,
    playError,
    playNotification,
    playClick,
  };
}
