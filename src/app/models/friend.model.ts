export interface Friend {
  id: string;
  username: string;
  avatar?: string;
  status: string;
  isOnline: boolean;
  playlistsCount: number;
}

export interface FriendRequest {
  id: string;
  from: FriendUserInfo;
  timestamp: string;
  status: string;
}

export interface FriendUserInfo {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}
