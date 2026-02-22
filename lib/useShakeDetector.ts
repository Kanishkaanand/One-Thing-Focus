import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';

interface ShakeDetectorOptions {
  onShake: () => void;
  threshold?: number;
  requiredShakeCount?: number;
  timeWindow?: number;
  cooldown?: number;
  enabled?: boolean;
}

export function useShakeDetector({
  onShake,
  threshold = 1.5,
  requiredShakeCount = 3,
  timeWindow = 1000,
  cooldown = 2000,
  enabled = true,
}: ShakeDetectorOptions): void {
  const shakeTimestamps = useRef<number[]>([]);
  const lastShakeFired = useRef(0);
  const onShakeRef = useRef(onShake);

  useEffect(() => {
    onShakeRef.current = onShake;
  }, [onShake]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!enabled) return;

    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      // expo-sensors returns values in G (rest ≈ 1.0)
      const delta = Math.abs(Math.sqrt(x * x + y * y + z * z) - 1.0);
      if (delta < threshold) return;

      const now = Date.now();
      if (now - lastShakeFired.current < cooldown) return;

      shakeTimestamps.current.push(now);
      shakeTimestamps.current = shakeTimestamps.current.filter(
        (t) => now - t < timeWindow,
      );

      if (shakeTimestamps.current.length >= requiredShakeCount) {
        shakeTimestamps.current = [];
        lastShakeFired.current = now;
        onShakeRef.current();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [threshold, requiredShakeCount, timeWindow, cooldown, enabled]);
}
