import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class StreamService {
  constructor(private api: ApiService) {}

  joinStream(hostId: string): Observable<{ viewerCount: number }> {
    return this.api.post<{ viewerCount: number }>(`/streams/${hostId}/join`, {});
  }

  leaveStream(hostId: string): Observable<void> {
    return this.api.post<void>(`/streams/${hostId}/leave`, {});
  }

  getViewerCount(hostId: string): Observable<{ viewerCount: number }> {
    return this.api.get<{ viewerCount: number }>(`/streams/${hostId}/viewers`);
  }
}
