import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SseEvent<T = any> {
    type: string;
    data: T;
}

@Injectable({
    providedIn: 'root'
})
export class SseService implements OnDestroy {
    private eventSource: EventSource | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectDelay = 1000; // Start with 1 second
    private reconnectTimeout: any = null;
    private isConnecting = false;

    // Connection state
    private _isConnected = new BehaviorSubject<boolean>(false);
    isConnected$ = this._isConnected.asObservable();

    // Event subjects for different event types
    private _friendRequest = new Subject<{ action: string }>();
    private _friends = new Subject<{ action: string }>();
    private _liveUsers = new Subject<{ userId: string; username: string; action: string; genre: string }>();
    private _heartbeat = new Subject<{ timestamp: string }>();

    // Public observables
    friendRequest$ = this._friendRequest.asObservable();
    friends$ = this._friends.asObservable();
    liveUsers$ = this._liveUsers.asObservable();
    heartbeat$ = this._heartbeat.asObservable();

    constructor() {
        // Handle visibility change to pause/resume SSE connection
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    ngOnDestroy(): void {
        this.disconnect();
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    connect(): void {
        const token = localStorage.getItem('token');
        if (!token || this.isConnecting || this.eventSource) {
            return;
        }

        this.isConnecting = true;

        try {
            const url = `${environment.apiUrl}/sse/events?token=${encodeURIComponent(token)}`;
            this.eventSource = new EventSource(url);

            this.eventSource.onopen = () => {
                console.log('SSE connection established');
                this.isConnecting = false;
                this._isConnected.next(true);
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
            };

            this.eventSource.onerror = (error) => {
                console.error('SSE connection error', error);
                this.isConnecting = false;
                this._isConnected.next(false);
                this.handleDisconnect();
            };

            // Listen for specific event types
            this.eventSource.addEventListener('connected', (event: MessageEvent) => {
                console.log('SSE connected:', event.data);
            });

            this.eventSource.addEventListener('heartbeat', (event: MessageEvent) => {
                const data = JSON.parse(event.data);
                this._heartbeat.next(data);
            });

            this.eventSource.addEventListener('friendRequest', (event: MessageEvent) => {
                const data = JSON.parse(event.data);
                this._friendRequest.next(data);
            });

            this.eventSource.addEventListener('friends', (event: MessageEvent) => {
                const data = JSON.parse(event.data);
                this._friends.next(data);
            });

            this.eventSource.addEventListener('liveUsers', (event: MessageEvent) => {
                const data = JSON.parse(event.data);
                this._liveUsers.next(data);
            });

        } catch (error) {
            console.error('Failed to create EventSource', error);
            this.isConnecting = false;
            this.handleDisconnect();
        }
    }

    disconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        this.isConnecting = false;
        this._isConnected.next(false);
        this.reconnectAttempts = 0;
    }

    private handleDisconnect(): void {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        // Don't reconnect if tab is hidden
        if (document.hidden) {
            return;
        }

        // Exponential backoff for reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

            console.log(`SSE reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

            this.reconnectTimeout = setTimeout(() => {
                this.connect();
            }, delay);
        } else {
            console.error('SSE max reconnect attempts reached');
        }
    }

    private handleVisibilityChange(): void {
        if (document.hidden) {
            // Disconnect when tab becomes hidden to save resources
            this.disconnect();
        } else {
            // Reconnect when tab becomes visible
            this.reconnectAttempts = 0;
            this.connect();
        }
    }
}
