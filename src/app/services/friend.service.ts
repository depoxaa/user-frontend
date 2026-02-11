import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Friend, FriendRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class FriendService {
  constructor(private api: ApiService) {}

  getFriends(): Observable<Friend[]> {
    return this.api.get<Friend[]>('/friends');
  }

  getPendingRequests(): Observable<FriendRequest[]> {
    return this.api.get<FriendRequest[]>('/friends/requests');
  }

  getSentRequests(): Observable<FriendRequest[]> {
    return this.api.get<FriendRequest[]>('/friends/requests/sent');
  }

  sendRequest(receiverId: string): Observable<void> {
    return this.api.post<void>(`/friends/requests/${receiverId}`, {});
  }

  acceptRequest(requestId: string): Observable<void> {
    return this.api.post<void>(`/friends/requests/${requestId}/accept`, {});
  }

  rejectRequest(requestId: string): Observable<void> {
    return this.api.post<void>(`/friends/requests/${requestId}/reject`, {});
  }

  removeFriend(friendId: string): Observable<void> {
    return this.api.delete<void>(`/friends/${friendId}`);
  }

  areFriends(userId: string): Observable<boolean> {
    return this.api.get<boolean>(`/friends/check/${userId}`);
  }

  getLiveFriends(): Observable<Friend[]> {
    return this.api.get<Friend[]>('/friends/live');
  }
}
