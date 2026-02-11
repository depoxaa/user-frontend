import { ArtistInfo, Song } from './song.model';

export interface Album {
  id: string;
  title: string;
  coverArt?: string;
  releaseDate: Date;
  artist: ArtistInfo;
  songsCount: number;
}

export interface AlbumDetail extends Album {
  songs: Song[];
}

export interface CreateAlbumRequest {
  title: string;
  releaseDate: Date;
}
