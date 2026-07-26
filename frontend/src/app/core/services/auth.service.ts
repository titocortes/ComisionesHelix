import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthUser, LoginRequest, LoginResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = '/api/v1/auth';

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => this.storeSession(res))
    );
  }

  refreshToken(): Observable<string> {
    const token = localStorage.getItem('refresh_token');
    if (!token) {
      this.logout();
      return throwError(() => new Error('No refresh token'));
    }
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/refresh`, { refreshToken: token })
      .pipe(
        tap(res => this.storeSession(res)),
        map(res => res.access_token),
        catchError(err => {
          this.logout();
          return throwError(() => err);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getCurrentUser(): AuthUser | null {
    const raw = localStorage.getItem('current_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }

  private storeSession(res: LoginResponse): void {
    localStorage.setItem('access_token', res.access_token);
    localStorage.setItem('refresh_token', res.refresh_token);
    localStorage.setItem('current_user', JSON.stringify(res.user));
  }
}
