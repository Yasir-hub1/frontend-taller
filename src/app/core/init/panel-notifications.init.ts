import { PanelBackgroundNotificationsService } from '../services/panel-background-notifications.service';

/** Arranca SSE + Web Push en segundo plano para admin y taller (solo navegador). */
export function initPanelBackgroundNotifications(bg: PanelBackgroundNotificationsService) {
  return () => {
    bg.start();
    return Promise.resolve();
  };
}
