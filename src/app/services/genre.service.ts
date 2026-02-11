import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { GenreInfo } from '../models';

@Injectable({
  providedIn: 'root'
})
export class GenreService {
  constructor(private api: ApiService) {}

  getAll(): Observable<GenreInfo[]> {
    return this.api.get<GenreInfo[]>('/genres');
  }

  getById(id: string): Observable<GenreInfo> {
    return this.api.get<GenreInfo>(`/genres/${id}`);
  }
}
