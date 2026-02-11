export interface Artist {
  id: string;
  name: string;
  email: string;
  bio?: string;
  profileImage?: string;
  isEmailConfirmed: boolean;
  isLive: boolean;
  liveStreamGenre?: string;
  listenersCount: number;
  totalSongs: number;
  totalPlays: number;
  totalLikes: number;
  subscribersCount: number;
}

export interface ArtistRegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  bio?: string;
}

export interface ArtistAuthResponse {
  token: string;
  expiresAt: Date;
  artist: Artist;
}

export interface UpdateArtistRequest {
  name?: string;
  bio?: string;
}

export interface ArtistStats {
  totalSongs: number;
  totalPlays: number;
  totalListeningHours: number;
  totalLikes: number;
  monthlyListeners: number;
  revenue: number;
}

export interface LiveArtist {
  id: string;
  name: string;
  profileImage?: string;
  liveStreamGenre: string;
  listenersCount: number;
}
