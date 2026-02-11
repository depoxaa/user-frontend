export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  isEmailConfirmed: boolean;
  isOnline: boolean;
  currentlyListeningStatus?: string;
  friendsCount: number;
  subscribedArtistsCount: number;
  totalSongsInPlaylists: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: Date;
  user: User;
}

export interface ConfirmEmailRequest {
  email: string;
  code: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  currentlyListeningStatus?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}
