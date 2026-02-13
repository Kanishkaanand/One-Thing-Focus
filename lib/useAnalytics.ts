/**
 * Analytics Hooks
 *
 * React hooks for analytics tracking in components.
 */

import { useEffect, useRef, useCallback } from 'react';
import { trackEvent, trackScreenViewed } from './analytics';

/**
 * Hook for tracking screen views and time spent
 *
 * @param screenName - Name of the screen being tracked
 *
 * @example
 * function HomeScreen() {
 *   useScreenAnalytics('Home');
 *   // ...
 * }
 */
export function useScreenAnalytics(screenName: string): void {
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    trackScreenViewed(screenName);

    return () => {
      const duration = Date.now() - startTimeRef.current;
      trackEvent('screen_exited', {
        screenName,
        durationMs: duration,
        durationSeconds: Math.round(duration / 1000),
      });
    };
  }, [screenName]);
}

/**
 * Hook that returns a tracking function for custom events
 *
 * @example
 * function MyComponent() {
 *   const track = useTrackEvent();
 *   const handleButtonClick = () => {
 *     track('button_clicked', { buttonId: 'save' });
 *   };
 * }
 */
export function useTrackEvent() {
  return useCallback(
    (eventName: string, properties?: Record<string, unknown>) => {
      trackEvent(eventName, properties);
    },
    []
  );
}

/**
 * Hook for tracking component mount/unmount with timing
 *
 * @param componentName - Name of the component being tracked
 *
 * @example
 * function ExpensiveComponent() {
 *   useComponentAnalytics('ExpensiveComponent');
 *   // ...
 * }
 */
export function useComponentAnalytics(componentName: string): void {
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    mountTimeRef.current = Date.now();
    trackEvent('component_mounted', { componentName });

    return () => {
      const duration = Date.now() - mountTimeRef.current;
      trackEvent('component_unmounted', {
        componentName,
        mountDurationMs: duration,
      });
    };
  }, [componentName]);
}

/**
 * Hook for tracking user interactions with timing
 *
 * @returns Object with track function and timing helpers
 *
 * @example
 * function TaskInput() {
 *   const { trackInteraction, startTimer, endTimer } = useInteractionAnalytics();
 *
 *   const handleFocus = () => startTimer('task_input');
 *   const handleSubmit = () => {
 *     endTimer('task_input');
 *     trackInteraction('task_submitted');
 *   };
 * }
 */
export function useInteractionAnalytics() {
  const timersRef = useRef<Record<string, number>>({});

  const startTimer = useCallback((timerId: string) => {
    timersRef.current[timerId] = Date.now();
  }, []);

  const endTimer = useCallback((timerId: string): number | null => {
    const startTime = timersRef.current[timerId];
    if (!startTime) return null;

    const duration = Date.now() - startTime;
    delete timersRef.current[timerId];
    return duration;
  }, []);

  const trackInteraction = useCallback(
    (
      interactionName: string,
      properties?: Record<string, unknown>,
      timerId?: string
    ) => {
      const duration = timerId ? endTimer(timerId) : undefined;
      trackEvent('user_interaction', {
        interaction: interactionName,
        ...properties,
        ...(duration !== undefined && duration !== null
          ? { durationMs: duration }
          : {}),
      });
    },
    [endTimer]
  );

  return {
    trackInteraction,
    startTimer,
    endTimer,
  };
}
