import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { isDevMode } from '@angular/core';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { routes } from './app.routes';
import { authReducer } from './store/auth/auth.reducer';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { initAuth } from './core/init/auth.init';
import { HttpClient } from '@angular/common/http';
import { StorageService } from './core/services/storage.service';
import { Store } from '@ngrx/store';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimationsAsync(),
    provideStore({ auth: authReducer }),
    ...(isDevMode()
      ? [provideStoreDevtools({ maxAge: 40, logOnly: false })]
      : []),
    provideCharts(withDefaultRegisterables()),
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: { panelClass: 'app-dialog-panel', autoFocus: 'first-tabbable' },
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [HttpClient, StorageService, Store],
      multi: true,
    },
  ],
};
