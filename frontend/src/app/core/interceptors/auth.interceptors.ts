import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

let refreshing = false;
const refreshToken$ = new BehaviorSubject<string | null>(null);

function withBearer(req: HttpRequest<unknown>, token: string) {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = localStorage.getItem('access_token');
  const authReq = token ? withBearer(req, token) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || req.url.includes('/auth/')) {
        return throwError(() => err);
      }

      if (!refreshing) {
        refreshing = true;
        refreshToken$.next(null);

        return auth.refreshToken().pipe(
          switchMap(newToken => {
            refreshing = false;
            refreshToken$.next(newToken);
            return next(withBearer(req, newToken));
          }),
          catchError(refreshErr => {
            refreshing = false;
            return throwError(() => refreshErr);
          })
        );
      }

      // Cola: espera a que el refresh en curso termine y reintenta
      return refreshToken$.pipe(
        filter((t): t is string => t !== null),
        take(1),
        switchMap(newToken => next(withBearer(req, newToken)))
      );
    })
  );
};
