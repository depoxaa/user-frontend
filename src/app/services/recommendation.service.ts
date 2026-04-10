import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Song } from '../models';

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  constructor(private api: ApiService) {}

  getRecommendations(limit: number = 20, offset: number = 0): Observable<Song[]> {
    return this.api.get<Song[]>(`/recommendations?limit=${limit}&offset=${offset}`);
  }

  getPlayCount(): Observable<number> {
    return this.api.get<number>('/recommendations/count');
  }
}
