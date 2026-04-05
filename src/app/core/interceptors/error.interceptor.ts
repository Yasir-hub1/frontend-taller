import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MessagesService } from '../services/messages.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messages = inject(MessagesService);
  const platformId = inject(PLATFORM_ID);
  return next(req).pipe(
    catchError((err) => {
      if (!isPlatformBrowser(platformId)) {
        return throwError(() => err);
      }
      const status = err.status ?? 0;
      if (status === 401) {
        return throwError(() => err);
      }
      if (status === 0 || status >= 400) {
        messages.error(messages.parseHttpErrorPayload(err));
      }
      return throwError(() => err);
    }),
  );
};
