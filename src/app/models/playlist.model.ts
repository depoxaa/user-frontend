export interface Playlist {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  coverImage?: string;
  status: string;
  tracksCount: number;
  viewCount: number;
  createdAt: Date;
  owner?: UserInfo;
}

export interface PlaylistDetail extends Playlist {
  songs: PlaylistSong[];
  recentViewers: PlaylistViewer[];
}

export interface PlaylistSong {
  order: number;
  songId: string;
  title: string;
  artist: string;
  duration: string;
  coverArt?: string;
  isLiked: boolean;
}

export interface PlaylistViewer {
  userId: string;
  username: string;
  avatar?: string;
  lastViewed: string;
}

export interface UserInfo {
  id: string;
  username: string;
  avatar?: string;
}

export interface CreatePlaylistRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  status?: string;
}

export interface UpdatePlaylistRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  status?: string;
}

export interface AddSongToPlaylistRequest {
  songId: string;
}
