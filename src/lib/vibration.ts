/**
 * En español:
 * Esta función activa la vibración del dispositivo si la API de Vibración está disponible
 * y la aplicación se está ejecutando en modo PWA (Progressive Web App).
 * @param pattern El patrón de vibración (en milisegundos). Por defecto es 50ms.
 */
export const triggerVibration = (pattern: number | number[] = 50): void => {
  // Check if the Vibration API is supported
  if (typeof window !== 'undefined' && typeof window.navigator.vibrate === 'function') {
    // Check if the app is in PWA mode
    // This relies on a class 'pwa-mode' being added to the body or html element
    // as seen in src/app/layout.tsx
    const isPwaMode =
      document.body.classList.contains('pwa-mode') ||
      document.documentElement.classList.contains('pwa-mode');

    if (isPwaMode) {
      try {
        window.navigator.vibrate(pattern);
      } catch (error) {
        console.warn('Vibration failed:', error);
      }
    }
  }
};
