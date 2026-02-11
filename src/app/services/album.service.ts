import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Album, AlbumDetail, CreateAlbumRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AlbumService {
  constructor(private api: ApiService) {}

  getById(id: string): Observable<AlbumDetail> {
    return this.api.get<AlbumDetail>(`/albums/${id}`);
  }

  getByArtist(artistId: string): Observable<Album[]> {
    return this.api.get<Album[]>(`/albums/artist/${artistId}`);
  }

  getMyAlbums(): Observable<Album[]> {
    return this.api.get<Album[]>('/albums/my');
  }

  create(data: CreateAlbumRequest, coverFile?: File): Observable<Album> {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('releaseDate', data.releaseDate.toISOString());
    if (coverFile) {
      formData.append('coverFile', coverFile);
    }
    return this.api.postFormData<Album>('/albums', formData);
  }

  update(id: string, data: CreateAlbumRequest): Observable<Album> {
    return this.api.put<Album>(`/albums/${id}`, data);
  }

  updateCover(id: string, file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postFormData<string>(`/albums/${id}/cover`, formData);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/albums/${id}`);
  }
}
