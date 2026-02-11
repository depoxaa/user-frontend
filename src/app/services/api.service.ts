import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private getMultipartHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, { headers: this.getHeaders() })
      .pipe(map(response => response.data as T));
  }

  post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data, { headers: this.getHeaders() })
      .pipe(map(response => response.data as T));
  }

  postFormData<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, formData, { headers: this.getMultipartHeaders() })
      .pipe(map(response => response.data as T));
  }

  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data, { headers: this.getHeaders() })
      .pipe(map(response => response.data as T));
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, { headers: this.getHeaders() })
      .pipe(map(response => response.data as T));
  }

  getFileUrl(path: string): string {
    return `${this.baseUrl}/files/${path}`;
  }

  getStreamUrl(songId: string): string {
    return `${this.baseUrl}/songs/${songId}/stream`;
  }
}
