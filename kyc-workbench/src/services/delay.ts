/** Künstliche Ladezeit für simulierte Dienste */
export const delay = (ms = 700) => new Promise<void>((resolve) => setTimeout(resolve, ms + Math.random() * 400));
