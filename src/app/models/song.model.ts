export interface Song {
  id: string;
  title: string;
  coverArt?: string;
  duration: string;
  releaseDate: Date;
  totalPlays: number;
  totalLikes: number;
  totalListeningTime: string;
  artist: ArtistInfo;
  album?: AlbumInfo;
  genre: GenreInfo;
  isLiked: boolean;
  price: number;
  isFree: boolean;
  isPurchased: boolean;
}

export interface ArtistInfo {
  id: string;
  name: string;
  profileImage?: string;
  bio?: string;
}

export interface AlbumInfo {
  id: string;
  title: string;
  coverArt?: string;
}

export interface GenreInfo {
  id: string;
  name: string;
}

export interface CreateSongRequest {
  title: string;
  genreId: string;
  albumId?: string;
  albumName?: string;
  releaseDate?: Date;
  price?: number;
}

export interface UpdateSongRequest {
  title?: string;
  genreId?: string;
  albumId?: string;
  releaseDate?: Date;
  price?: number;
}

export interface SongPurchaseResponse {
  id: string;
  songId: string;
  songTitle: string;
  amount: number;
  currency: string;
  purchasedAt: Date;
}
