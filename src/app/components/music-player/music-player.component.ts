import { Component, OnInit, OnDestroy, signal, computed, HostListener, effect, untracked } from '@angular/core';
import { forkJoin, Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AuthService,
  AudioPlayerService,
  SongService,
  PlaylistService,
  FriendService,
  ArtistService,
  UserService,
  SseService,
  PaymentService
} from '../../services';
import { Song, Playlist, PlaylistDetail, Friend, Artist, FriendRequest, User } from '../../models';
import { environment } from '../../../environments/environment';

interface LiveUser {
  id: string;
  name: string;
  genre: string;
  listeners: number;
  avatar?: string;
  isArtist: boolean;
}

@Component({
  selector: 'app-music-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './music-player.component.html',
  styleUrl: './music-player.component.scss'
})
export class MusicPlayerComponent implements OnInit, OnDestroy {
  // Interval IDs for live streaming
  private broadcastIntervalId: any = null;
  private syncIntervalId: any = null;
  private sseSubscriptions: Subscription[] = [];
  // Panel widths
  leftWidth = signal<number>(256);
  middleWidth = signal<number>(320);
  isDraggingLeft = signal<boolean>(false);
  isDraggingMiddle = signal<boolean>(false);

  readonly MIN_LEFT_WIDTH = 200;
  readonly MAX_LEFT_WIDTH = 400;
  readonly MIN_MIDDLE_WIDTH = 280;
  readonly MAX_MIDDLE_WIDTH = 500;

  // Search
  searchQuery = signal<string>('');
  globalSearchQuery = signal<string>('');
  searchResults = signal<Song[]>([]);
  private searchSubject = new Subject<string>();

  // Data
  playlists = signal<Playlist[]>([]);
  selectedPlaylist = signal<string>('');
  currentPlaylistSongs = signal<Song[]>([]);
  friends = signal<Friend[]>([]);
  likedSongs = signal<Song[]>([]);
  liveUsers = signal<LiveUser[]>([]);
  subscribedArtists = signal<Artist[]>([]);
  friendRequests = signal<FriendRequest[]>([]);

  // User Live Streaming
  isUserLive = signal<boolean>(false);
  userLiveGenre = signal<string>('');
  userLiveListeners = signal<number>(0);

  // Ghost Mode (Live Stream)
  isGhostMode = signal<boolean>(false);
  selectedLiveUser = signal<LiveUser | null>(null);

  // Selected Friend (viewing their playlists)
  selectedFriend = signal<Friend | null>(null);
  friendPlaylists = signal<Playlist[]>([]);

  // Selected Artist (viewing their songs)
  selectedArtist = signal<Artist | null>(null);
  artistSongs = signal<Song[]>([]);

  // Current Song
  currentSong = signal<Song | null>(null);
  likedSongIds = signal<Set<string>>(new Set());

  // UI State
  showUserProfile = signal<boolean>(false);
  showFriends = signal<boolean>(false);
  showArtists = signal<boolean>(false);
  showFriendRequests = signal<boolean>(false);
  showAccountSearch = signal<boolean>(false);
  showPlaylistDetail = signal<boolean>(false);
  showPlaylistEdit = signal<boolean>(false);
  showCreatePlaylist = signal<boolean>(false);
  showSongToPlaylist = signal<Song | null>(null);
  showGoLive = signal<boolean>(false);
  openMenuId = signal<string | null>(null);
  playlistsWithSong = signal<Set<string>>(new Set());
  showPurchaseModal = signal<Song | null>(null);
  isPurchasing = signal<boolean>(false);

  // Context Menu
  contextMenu = signal<{
    visible: boolean;
    x: number;
    y: number;
    type: 'playlist' | 'song' | 'friend' | null;
    target: Playlist | Song | Friend | null;
  }>({ visible: false, x: 0, y: 0, type: null, target: null });

  // Playlist management
  selectedPlaylistForAction = signal<Playlist | null>(null);
  editPlaylistForm = {
    name: '',
    description: '',
    status: 'Private' as 'Public' | 'Private',
    icon: '🎵',
    color: '#3b82f6'
  };

  // Form data
  newPlaylistName = '';
  newPlaylistDescription = '';
  newPlaylistImage: File | null = null;
  newPlaylistImagePreview = signal<string | null>(null);
  accountSearchQuery = '';
  accountSearchResults = signal<User[]>([]);
  goLiveGenre = '';

  // Artist subscription
  artistSearchQuery = '';
  artistSearchResults = signal<Artist[]>([]);

  // Edit profile
  showEditProfile = signal<boolean>(false);
  showChangePassword = signal<boolean>(false);
  editProfileForm = {
    username: '',
    email: ''
  };
  changePasswordForm = {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  };
  avatarFile: File | null = null;
  avatarPreview = signal<string | null>(null);

  // Edit playlist image
  editPlaylistImage: File | null = null;
  editPlaylistImagePreview = signal<string | null>(null);

  user = computed(() => this.authService.user());

  // Display playlists (user's or friend's)
  displayPlaylists = computed(() => {
    return this.selectedFriend() ? this.friendPlaylists() : this.playlists();
  });

  // Filtered Live Users
  filteredLiveUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.liveUsers();

    return this.liveUsers().filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.genre.toLowerCase().includes(query)
    );
  });

  // Filtered Friends
  filteredFriends = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.friends();

    return this.friends().filter(friend =>
      friend.username.toLowerCase().includes(query) ||
      (friend.status && friend.status.toLowerCase().includes(query))
    );
  });

  constructor(
    public authService: AuthService,
    public audioPlayer: AudioPlayerService,
    private songService: SongService,
    private playlistService: PlaylistService,
    private friendService: FriendService,
    private artistService: ArtistService,
    private userService: UserService,
    private router: Router,
    private sseService: SseService,
    private paymentService: PaymentService
  ) {
    // Immediate broadcast when play/pause state changes
    effect(() => {
      const isPlaying = this.audioPlayer.isPlaying();
      const currentSong = this.audioPlayer.currentSong();

      untracked(() => {
        if (this.isUserLive()) {
          this.broadcastPlayback();
        }
      });
    });

    // Check song in playlists when modal opens
    effect(() => {
      const song = this.showSongToPlaylist();
      if (song) {
        untracked(() => {
          this.checkSongInPlaylists(song.id);
        });
      } else {
        untracked(() => {
          this.playlistsWithSong.set(new Set());
        });
      }
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.setupSseSubscriptions();

    // Setup live search
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(query => {
      this.performSearch(query);
    });
  }

  ngOnDestroy(): void {
    this.clearBroadcastInterval();
    this.clearSyncInterval();
    this.sseSubscriptions.forEach(sub => sub.unsubscribe());
    this.sseService.disconnect();
  }

  private clearBroadcastInterval(): void {
    if (this.broadcastIntervalId) {
      clearInterval(this.broadcastIntervalId);
      this.broadcastIntervalId = null;
    }
  }

  private clearSyncInterval(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  private setupSseSubscriptions(): void {
    // Connect SSE
    this.sseService.connect();

    // Subscribe to friend request events
    this.sseSubscriptions.push(
      this.sseService.friendRequest$.subscribe(() => {
        this.loadFriendRequests();
      })
    );

    // Subscribe to friends updates (added/removed)
    this.sseSubscriptions.push(
      this.sseService.friends$.subscribe(() => {
        this.loadFriends();
      })
    );

    // Subscribe to live users updates
    this.sseSubscriptions.push(
      this.sseService.liveUsers$.subscribe(() => {
        this.loadLiveUsers();
      })
    );
  }

  private refreshUserProfile(): void {
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.authService.updateUser(user);
      },
      error: (err) => console.error('Failed to refresh user profile', err)
    });
  }

  loadData(): void {
    this.loadPlaylists();
    this.loadFriends();
    this.loadLikedSongs();
    this.loadLiveUsers();
    this.loadSubscribedArtists();
    this.loadFriendRequests();
  }

  loadPlaylists(): void {
    this.playlistService.getMyPlaylists().subscribe({
      next: (playlists) => {
        this.playlists.set(playlists);
        if (playlists.length > 0 && !this.selectedPlaylist()) {
          this.selectPlaylist(playlists[0].id);
        }
      },
      error: (err) => console.error('Failed to load playlists', err)
    });
  }

  loadFriends(): void {
    this.friendService.getFriends().subscribe({
      next: (friends) => this.friends.set(friends),
      error: (err) => console.error('Failed to load friends', err)
    });
  }

  loadLikedSongs(): void {
    this.songService.getLikedSongs().subscribe({
      next: (songs) => {
        this.likedSongs.set(songs);
        this.likedSongIds.set(new Set(songs.map(s => s.id)));
      },
      error: (err) => console.error('Failed to load liked songs', err)
    });
  }

  loadLiveUsers(): void {
    // Load live artists
    this.artistService.getLiveArtists().subscribe({
      next: (artists) => {
        const liveArtists: LiveUser[] = artists.map(a => ({
          id: a.id,
          name: a.name,
          genre: a.liveStreamGenre || 'Live Stream',
          listeners: a.listenersCount,
          avatar: a.profileImage,
          isArtist: true
        }));

        // Also load live friends (users who are streaming)
        this.friendService.getLiveFriends().subscribe({
          next: (liveFriends) => {
            const liveFriendUsers: LiveUser[] = liveFriends.map(f => ({
              id: f.id,
              name: f.username,
              genre: f.status || 'Listening Live',
              listeners: 0, // Will be updated from status
              avatar: f.avatar,
              isArtist: false
            }));
            this.liveUsers.set([...liveArtists, ...liveFriendUsers]);
          },
          error: () => {
            // If endpoint doesn't exist, just show artists
            this.liveUsers.set(liveArtists);
          }
        });
      },
      error: (err) => console.error('Failed to load live artists', err)
    });
  }

  loadSubscribedArtists(): void {
    this.artistService.getSubscribedArtists().subscribe({
      next: (artists) => this.subscribedArtists.set(artists),
      error: (err) => console.error('Failed to load subscribed artists', err)
    });
  }

  loadFriendRequests(): void {
    this.friendService.getPendingRequests().subscribe({
      next: (requests) => this.friendRequests.set(requests),
      error: (err) => console.error('Failed to load friend requests', err)
    });
  }

  // Artist subscription methods
  searchArtistsToFollow(): void {
    if (!this.artistSearchQuery.trim()) {
      this.artistSearchResults.set([]);
      return;
    }

    this.artistService.search(this.artistSearchQuery).subscribe({
      next: (artists) => this.artistSearchResults.set(artists),
      error: (err) => console.error('Failed to search artists', err)
    });
  }

  isArtistSubscribed(artistId: string): boolean {
    return this.subscribedArtists().some(a => a.id === artistId);
  }

  toggleArtistSubscription(artist: Artist): void {
    this.artistService.toggleSubscription(artist.id).subscribe({
      next: (isSubscribed) => {
        if (isSubscribed) {
          // Add to subscribed artists
          this.subscribedArtists.update(artists => [...artists, artist]);
        } else {
          // Remove from subscribed artists
          this.subscribedArtists.update(artists => artists.filter(a => a.id !== artist.id));
        }
        // Update search results to reflect new state
        this.artistSearchResults.update(artists => [...artists]);
        // Refresh user profile to update artist count
        this.refreshUserProfile();
      },
      error: (err) => console.error('Failed to toggle subscription', err)
    });
  }


  // Playlist selection
  selectPlaylist(playlistId: string): void {
    this.selectedPlaylist.set(playlistId);
    this.globalSearchQuery.set(''); // Clear search when selecting playlist
    this.searchResults.set([]);

    this.playlistService.getById(playlistId).subscribe({
      next: (detail) => {
        if (detail.songs) {
          const songs: Song[] = detail.songs.map(ps => ({
            id: ps.songId,
            title: ps.title,
            coverArt: ps.coverArt,
            duration: ps.duration,
            isLiked: ps.isLiked,
            artist: { id: '', name: ps.artist, profileImage: '' },
            genre: { id: '', name: '' },
            releaseDate: new Date(),
            totalPlays: 0,
            totalLikes: 0,
            totalListeningTime: '',
            price: 0,
            isFree: true,
            isPurchased: true
          }));
          this.currentPlaylistSongs.set(songs);
        }
      }
    });
  }

  // === USER GO LIVE FUNCTIONALITY ===

  toggleUserLive(): void {
    if (this.isUserLive()) {
      this.stopUserLive();
    } else {
      this.showGoLive.set(true);
    }
  }

  startUserLive(): void {
    if (!this.goLiveGenre.trim()) {
      alert('Please select a genre for your stream');
      return;
    }

    // Update user status to indicate they're live
    this.userService.updateListeningStatus(`🔴 LIVE: ${this.goLiveGenre}`).subscribe({
      next: () => {
        this.isUserLive.set(true);
        this.userLiveGenre.set(this.goLiveGenre);
        this.showGoLive.set(false);

        // Add self to live users list (friends will see this)
        const currentUser = this.user();
        if (currentUser) {
          const selfLive: LiveUser = {
            id: currentUser.id,
            name: currentUser.username,
            genre: this.goLiveGenre,
            listeners: 0,
            avatar: currentUser.avatar,
            isArtist: false
          };
          this.liveUsers.update(users => [selfLive, ...users]);
        }

        // Start broadcasting playback position every 3 seconds
        this.startBroadcasting();
      },
      error: (err) => console.error('Failed to go live', err)
    });
  }

  private startBroadcasting(): void {
    this.clearBroadcastInterval();

    // Broadcast immediately
    this.broadcastPlayback();

    // Then broadcast every 3 seconds
    this.broadcastIntervalId = setInterval(() => {
      this.broadcastPlayback();
    }, 3000);
  }

  private broadcastPlayback(): void {
    const currentSong = this.audioPlayer.currentSong();
    if (currentSong) {
      this.userService.updatePlayback(
        currentSong.id,
        this.audioPlayer.currentTime(),
        !this.audioPlayer.isPlaying()
      ).subscribe();
    }
  }

  stopUserLive(): void {
    this.clearBroadcastInterval();

    this.userService.updateListeningStatus(null).subscribe({
      next: () => {
        this.isUserLive.set(false);
        this.userLiveGenre.set('');
        this.userLiveListeners.set(0);

        // Remove self from live users
        const currentUser = this.user();
        if (currentUser) {
          this.liveUsers.update(users => users.filter(u => u.id !== currentUser.id));
        }

        // Reload live users to ensure the list is up to date
        this.loadLiveUsers();
      },
      error: (err) => console.error('Failed to stop live', err)
    });
  }

  // Ghost Mode - Live Stream
  joinLiveStream(liveUser: LiveUser): void {
    this.selectedLiveUser.set(liveUser);
    this.isGhostMode.set(true);
    this.audioPlayer.setGhostMode(true);

    // Start syncing to the streamer's playback
    this.startSyncing(liveUser.id);
  }

  private startSyncing(userId: string): void {
    this.clearSyncInterval();

    // Sync immediately
    this.syncToStreamer(userId);

    // Then sync every 3 seconds
    this.syncIntervalId = setInterval(() => {
      this.syncToStreamer(userId);
    }, 3000);
  }

  private syncToStreamer(userId: string): void {
    this.userService.getLivePlayback(userId).subscribe({
      next: (playback) => {
        if (playback.isLive && playback.songId) {
          // Calculate the actual position accounting for time since last update
          let position = playback.position;
          if (playback.updatedAt) {
            const secondsSinceUpdate = (Date.now() - new Date(playback.updatedAt).getTime()) / 1000;
            position = playback.position + secondsSinceUpdate;
          }

          this.audioPlayer.syncToSong(playback.songId, position, playback.isPaused);
        }
      },
      error: (err) => console.error('Failed to sync to streamer', err)
    });
  }

  exitGhostMode(): void {
    this.clearSyncInterval();
    this.isGhostMode.set(false);
    this.selectedLiveUser.set(null);
    this.audioPlayer.setGhostMode(false);
    this.audioPlayer.pause();
  }

  // Friend playlists
  viewFriendPlaylists(friend: Friend): void {
    this.selectedFriend.set(friend);
    this.playlistService.getByUser(friend.id).subscribe({
      next: (playlists) => {
        this.friendPlaylists.set(playlists);
        if (playlists.length > 0) {
          this.selectPlaylist(playlists[0].id);
        }
      },
      error: () => {
        this.friendPlaylists.set([]);
      }
    });
  }

  backToMyPlaylists(): void {
    this.selectedFriend.set(null);
    this.friendPlaylists.set([]);
    if (this.playlists().length > 0) {
      this.selectPlaylist(this.playlists()[0].id);
    }
  }

  viewArtistSongs(artist: Artist): void {
    this.selectedArtist.set(artist);
    this.showArtists.set(false);
    this.songService.getByArtist(artist.id).subscribe({
      next: (songs) => {
        this.artistSongs.set(songs);
        // Set first song as current if available
        if (songs.length > 0) {
          this.currentPlaylistSongs.set(songs);
        }
      },
      error: () => {
        this.artistSongs.set([]);
      }
    });
  }

  backFromArtistSongs(): void {
    this.selectedArtist.set(null);
    this.artistSongs.set([]);
  }

  // Global search
  onSearchInput(query: string): void {
    this.globalSearchQuery.set(query);
    this.searchSubject.next(query);
  }

  performSearch(query: string): void {
    if (!query.trim()) {
      this.searchResults.set([]);
      return;
    }

    this.songService.search(query).subscribe({
      next: (results) => this.searchResults.set(results),
      error: (err) => console.error('Search failed', err)
    });
  }

  onGlobalSearch(): void {
    this.performSearch(this.globalSearchQuery());
  }

  // Song actions
  playSong(song: Song): void {
    if (!song.isFree && !song.isPurchased) {
      this.showPurchaseModal.set(song);
      return;
    }
    this.currentSong.set(song);

    const displaySongs = this.selectedArtist() ? this.artistSongs() : this.getDisplaySongs();
    const index = displaySongs.findIndex(s => s.id === song.id);
    if (displaySongs.length > 0 && index !== -1) {
      this.audioPlayer.setPlaylistWithoutPlay(displaySongs, index);
    }

    this.audioPlayer.playSong(song);
  }

  purchaseSong(song: Song): void {
    this.isPurchasing.set(true);
    this.paymentService.purchaseWithGooglePay(song).subscribe({
      next: () => {
        this.isPurchasing.set(false);
        this.showPurchaseModal.set(null);
        song.isPurchased = true;
        this.currentSong.set(song);
        this.audioPlayer.playSong(song);
      },
      error: (err) => {
        this.isPurchasing.set(false);
        console.error('Purchase failed', err);
        if (err?.message !== 'User closed the payment sheet') {
          alert('Purchase failed. Please try again.');
        }
      }
    });
  }

  toggleLike(song: Song, event?: Event): void {
    event?.stopPropagation();
    this.songService.toggleLike(song.id).subscribe({
      next: (isLiked) => {
        song.isLiked = isLiked;
        const ids = new Set(this.likedSongIds());
        if (isLiked) {
          ids.add(song.id);
        } else {
          ids.delete(song.id);
        }
        this.likedSongIds.set(ids);
      }
    });
  }

  // === ADD SONG TO PLAYLIST ===

  checkSongInPlaylists(songId: string): void {
    const playlists = this.playlists();
    if (playlists.length === 0) return;

    // Fetch details for all playlists to check if song exists
    const checks$ = playlists.map(p => this.playlistService.getById(p.id));

    forkJoin(checks$).subscribe({
      next: (details) => {
        const withSong = new Set<string>();
        details.forEach(d => {
          if (d.songs && d.songs.some(s => s.songId === songId)) {
            withSong.add(d.id);
          }
        });
        this.playlistsWithSong.set(withSong);
      },
      error: (err) => console.error('Failed to check playlists', err)
    });
  }

  addSongToPlaylist(playlistId: string): void {
    const song = this.showSongToPlaylist();
    if (!song) return;

    this.playlistService.addSong(playlistId, song.id).subscribe({
      next: () => {
        this.showSongToPlaylist.set(null);
        // Refresh playlist if it's the currently selected one
        if (this.selectedPlaylist() === playlistId) {
          this.selectPlaylist(playlistId);
        }
        // Update track count
        this.playlists.update(playlists =>
          playlists.map(p => p.id === playlistId
            ? { ...p, tracksCount: (p.tracksCount || 0) + 1 }
            : p
          )
        );
      },
      error: (err) => {
        console.error('Failed to add song to playlist', err);
        alert('Failed to add song to playlist');
      }
    });
  }

  // === PLAYLIST MANAGEMENT ===

  // Playlist management
  createPlaylist(): void {
    if (!this.newPlaylistName.trim()) return;

    this.playlistService.create({
      name: this.newPlaylistName,
      description: this.newPlaylistDescription,
      status: 'Private'
    }).subscribe({
      next: (playlist) => {
        // Upload cover image if selected
        if (this.newPlaylistImage) {
          this.playlistService.uploadCover(playlist.id, this.newPlaylistImage).subscribe({
            next: (coverImage) => {
              playlist.coverImage = coverImage;
              this.playlists.update(p => [...p, playlist]);
              this.resetNewPlaylistForm();
            },
            error: () => {
              // Still add the playlist even if image upload fails
              this.playlists.update(p => [...p, playlist]);
              this.resetNewPlaylistForm();
            }
          });
        } else {
          this.playlists.update(p => [...p, playlist]);
          this.resetNewPlaylistForm();
        }
      }
    });
  }

  private resetNewPlaylistForm(): void {
    this.newPlaylistName = '';
    this.newPlaylistDescription = '';
    this.newPlaylistImage = null;
    this.newPlaylistImagePreview.set(null);
    this.showCreatePlaylist.set(false);
  }

  togglePlaylistMenu(playlistId: string, event: Event): void {
    event.stopPropagation();
    this.openMenuId.set(this.openMenuId() === playlistId ? null : playlistId);
  }

  // View playlist details
  viewPlaylistDetails(playlist: Playlist, event: Event): void {
    event.stopPropagation();
    this.selectedPlaylistForAction.set(playlist);
    this.showPlaylistDetail.set(true);
    this.openMenuId.set(null);
  }

  // Edit playlist
  openEditPlaylist(playlist: Playlist, event: Event): void {
    event.stopPropagation();
    this.selectedPlaylistForAction.set(playlist);
    this.editPlaylistForm = {
      name: playlist.name,
      description: playlist.description || '',
      status: playlist.status as 'Public' | 'Private',
      icon: playlist.icon || '🎵',
      color: playlist.color || '#3b82f6'
    };
    this.showPlaylistEdit.set(true);
    this.openMenuId.set(null);
  }

  savePlaylistEdit(): void {
    const playlist = this.selectedPlaylistForAction();
    if (!playlist) return;

    // First, upload cover image if selected
    if (this.editPlaylistImage) {
      this.playlistService.uploadCover(playlist.id, this.editPlaylistImage).subscribe({
        next: (coverImage) => {
          this.updatePlaylistData(playlist, coverImage);
        },
        error: () => {
          // Still update the playlist even if image upload fails
          this.updatePlaylistData(playlist);
        }
      });
    } else {
      this.updatePlaylistData(playlist);
    }
  }

  private updatePlaylistData(playlist: Playlist, coverImage?: string): void {
    this.playlistService.update(playlist.id, {
      name: this.editPlaylistForm.name,
      description: this.editPlaylistForm.description,
      status: this.editPlaylistForm.status,
      icon: this.editPlaylistForm.icon,
      color: this.editPlaylistForm.color
    }).subscribe({
      next: (updated) => {
        const finalPlaylist = coverImage ? { ...updated, coverImage } : updated;
        this.playlists.update(playlists =>
          playlists.map(p => p.id === playlist.id ? { ...p, ...finalPlaylist } : p)
        );
        this.showPlaylistEdit.set(false);
        this.selectedPlaylistForAction.set(null);
        this.editPlaylistImage = null;
        this.editPlaylistImagePreview.set(null);
      },
      error: (err) => {
        console.error('Failed to update playlist', err);
        alert('Failed to update playlist');
      }
    });
  }

  // Delete playlist
  deletePlaylist(playlist: Playlist, event: Event): void {
    event.stopPropagation();
    this.openMenuId.set(null);

    if (!confirm(`Are you sure you want to delete "${playlist.name}"?`)) {
      return;
    }

    this.playlistService.delete(playlist.id).subscribe({
      next: () => {
        this.playlists.update(p => p.filter(pl => pl.id !== playlist.id));
        // If deleted playlist was selected, select another one
        if (this.selectedPlaylist() === playlist.id) {
          const remaining = this.playlists();
          if (remaining.length > 0) {
            this.selectPlaylist(remaining[0].id);
          } else {
            this.selectedPlaylist.set('');
            this.currentPlaylistSongs.set([]);
          }
        }
      },
      error: (err) => {
        console.error('Failed to delete playlist', err);
        alert('Failed to delete playlist');
      }
    });
  }

  closePlaylistModals(): void {
    this.showPlaylistDetail.set(false);
    this.showPlaylistEdit.set(false);
    this.selectedPlaylistForAction.set(null);
  }

  // Transition from detail view to edit view (preserves playlist reference)
  openEditFromDetail(): void {
    const playlist = this.selectedPlaylistForAction();
    if (!playlist) return;

    this.editPlaylistForm = {
      name: playlist.name,
      description: playlist.description || '',
      status: playlist.status as 'Public' | 'Private',
      icon: playlist.icon || '🎵',
      color: playlist.color || '#3b82f6'
    };
    this.showPlaylistDetail.set(false);
    this.showPlaylistEdit.set(true);
  }

  // Account search
  searchAccounts(): void {
    if (!this.accountSearchQuery.trim()) {
      this.accountSearchResults.set([]);
      return;
    }

    this.userService.searchUsers(this.accountSearchQuery).subscribe({
      next: (users) => {
        // Filter out existing friends to prevent duplicate requests
        const friendIds = new Set(this.friends().map(f => f.id));
        const currentUserId = this.user()?.id;

        const filtered = users.filter(u =>
          !friendIds.has(u.id) &&
          u.id !== currentUserId
        );
        this.accountSearchResults.set(filtered);
      },
      error: (err) => console.error('Account search failed', err)
    });
  }

  sendFriendRequest(userId: string): void {
    this.friendService.sendRequest(userId).subscribe({
      next: () => {
        this.accountSearchResults.update(users =>
          users.filter(u => u.id !== userId)
        );
        // Reload friend requests to update the sent requests list
        this.loadFriendRequests();
      }
    });
  }

  acceptFriendRequest(request: FriendRequest): void {
    this.friendService.acceptRequest(request.id).subscribe({
      next: () => {
        this.friendRequests.update(r => r.filter(req => req.id !== request.id));
        this.loadFriends();
      }
    });
  }

  rejectFriendRequest(request: FriendRequest): void {
    this.friendService.rejectRequest(request.id).subscribe({
      next: () => {
        this.friendRequests.update(r => r.filter(req => req.id !== request.id));
      }
    });
  }

  // === USER PROFILE EDIT ===

  openEditProfile(): void {
    const currentUser = this.user();
    if (currentUser) {
      this.editProfileForm = {
        username: currentUser.username,
        email: currentUser.email
      };
      this.avatarFile = null;
      this.avatarPreview.set(null);
    }
    this.showUserProfile.set(false);
    this.showEditProfile.set(true);
  }

  onAvatarSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.avatarFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatarPreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(this.avatarFile);
    }
  }

  saveProfile(): void {
    // First update avatar if changed
    if (this.avatarFile) {
      this.userService.updateAvatar(this.avatarFile).subscribe({
        next: (avatarPath) => {
          // Update user in auth service
          const currentUser = this.user();
          if (currentUser) {
            this.authService.updateUser({ ...currentUser, avatar: avatarPath });
          }
          this.updateProfileData();
        },
        error: (err) => {
          console.error('Failed to update avatar', err);
          alert('Failed to update avatar');
        }
      });
    } else {
      this.updateProfileData();
    }
  }

  private updateProfileData(): void {
    this.userService.updateProfile({
      username: this.editProfileForm.username,
      email: this.editProfileForm.email
    }).subscribe({
      next: (updatedUser) => {
        this.authService.updateUser(updatedUser);
        this.showEditProfile.set(false);
        this.avatarFile = null;
        this.avatarPreview.set(null);
      },
      error: (err) => {
        console.error('Failed to update profile', err);
        alert(err?.error?.message || 'Failed to update profile');
      }
    });
  }

  closeEditProfile(): void {
    this.showEditProfile.set(false);
    this.avatarFile = null;
    this.avatarPreview.set(null);
  }

  openChangePassword(): void {
    this.changePasswordForm = {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    };
    this.showEditProfile.set(false);
    this.showChangePassword.set(true);
  }

  savePassword(): void {
    if (this.changePasswordForm.newPassword !== this.changePasswordForm.confirmNewPassword) {
      alert('New passwords do not match');
      return;
    }
    if (this.changePasswordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    this.userService.changePassword(this.changePasswordForm).subscribe({
      next: () => {
        alert('Password changed successfully');
        this.showChangePassword.set(false);
      },
      error: (err) => {
        console.error('Failed to change password', err);
        alert(err?.error?.message || 'Failed to change password');
      }
    });
  }

  closeChangePassword(): void {
    this.showChangePassword.set(false);
  }

  // === PLAYLIST IMAGE ===

  onPlaylistImageSelect(event: Event, isNew: boolean): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (isNew) {
          this.newPlaylistImage = file;
          this.newPlaylistImagePreview.set(e.target?.result as string);
        } else {
          this.editPlaylistImage = file;
          this.editPlaylistImagePreview.set(e.target?.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  clearPlaylistImage(isNew: boolean): void {
    if (isNew) {
      this.newPlaylistImage = null;
      this.newPlaylistImagePreview.set(null);
    } else {
      this.editPlaylistImage = null;
      this.editPlaylistImagePreview.set(null);
    }
  }

  // Resize handlers
  startLeftResize(): void {
    this.isDraggingLeft.set(true);
  }

  startMiddleResize(): void {
    this.isDraggingMiddle.set(true);
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDraggingLeft()) {
      const newWidth = event.clientX;
      if (newWidth >= this.MIN_LEFT_WIDTH && newWidth <= this.MAX_LEFT_WIDTH) {
        this.leftWidth.set(newWidth);
      }
    } else if (this.isDraggingMiddle()) {
      const newWidth = event.clientX - this.leftWidth();
      if (newWidth >= this.MIN_MIDDLE_WIDTH && newWidth <= this.MAX_MIDDLE_WIDTH) {
        this.middleWidth.set(newWidth);
      }
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isDraggingLeft.set(false);
    this.isDraggingMiddle.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    // Close dropdown menu when clicking outside
    if (this.openMenuId()) {
      this.openMenuId.set(null);
    }
    // Close context menu when clicking outside
    if (this.contextMenu().visible) {
      this.closeContextMenu();
    }
  }

  // === CONTEXT MENU ===

  onPlaylistContextMenu(event: MouseEvent, playlist: Playlist): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenu.set({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      type: 'playlist',
      target: playlist
    });
  }

  onSongContextMenu(event: MouseEvent, song: Song): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenu.set({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      type: 'song',
      target: song
    });
  }

  onFriendContextMenu(event: MouseEvent, friend: Friend): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenu.set({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      type: 'friend',
      target: friend
    });
  }

  closeContextMenu(): void {
    this.contextMenu.set({ visible: false, x: 0, y: 0, type: null, target: null });
  }

  // Context menu actions
  contextMenuAction(action: string): void {
    const menu = this.contextMenu();
    if (!menu.target) return;

    switch (menu.type) {
      case 'playlist':
        this.handlePlaylistContextAction(action, menu.target as Playlist);
        break;
      case 'song':
        this.handleSongContextAction(action, menu.target as Song);
        break;
      case 'friend':
        this.handleFriendContextAction(action, menu.target as Friend);
        break;
    }
    this.closeContextMenu();
  }

  private handlePlaylistContextAction(action: string, playlist: Playlist): void {
    switch (action) {
      case 'view':
        this.selectedPlaylistForAction.set(playlist);
        this.showPlaylistDetail.set(true);
        break;
      case 'edit':
        this.selectedPlaylistForAction.set(playlist);
        this.editPlaylistForm = {
          name: playlist.name,
          description: playlist.description || '',
          status: playlist.status as 'Public' | 'Private',
          icon: playlist.icon || '🎵',
          color: playlist.color || '#3b82f6'
        };
        this.showPlaylistEdit.set(true);
        break;
      case 'delete':
        if (confirm(`Are you sure you want to delete "${playlist.name}"?`)) {
          this.playlistService.delete(playlist.id).subscribe({
            next: () => {
              this.playlists.update(p => p.filter(pl => pl.id !== playlist.id));
              if (this.selectedPlaylist() === playlist.id) {
                const remaining = this.playlists();
                if (remaining.length > 0) {
                  this.selectPlaylist(remaining[0].id);
                } else {
                  this.selectedPlaylist.set('');
                  this.currentPlaylistSongs.set([]);
                }
              }
            }
          });
        }
        break;
    }
  }

  private handleSongContextAction(action: string, song: Song): void {
    switch (action) {
      case 'play':
        this.playSong(song);
        break;
      case 'addToPlaylist':
        this.showSongToPlaylist.set(song);
        break;
      case 'like':
        this.toggleLike(song);
        break;
      case 'removeFromPlaylist':
        const playlistId = this.selectedPlaylist();
        if (playlistId) {
          this.playlistService.removeSong(playlistId, song.id).subscribe({
            next: () => {
              this.currentPlaylistSongs.update(songs =>
                songs.filter(s => s.id !== song.id)
              );
              this.playlists.update(playlists =>
                playlists.map(p => p.id === playlistId
                  ? { ...p, tracksCount: Math.max(0, (p.tracksCount || 1) - 1) }
                  : p
                )
              );
            }
          });
        }
        break;
    }
  }

  private handleFriendContextAction(action: string, friend: Friend): void {
    switch (action) {
      case 'viewPlaylists':
        this.viewFriendPlaylists(friend);
        break;
      case 'remove':
        if (confirm(`Are you sure you want to remove ${friend.username} from your friends?`)) {
          this.friendService.removeFriend(friend.id).subscribe({
            next: () => {
              this.friends.update(f => f.filter(fr => fr.id !== friend.id));
            }
          });
        }
        break;
    }
  }

  logout(): void {
    // Stop live stream if active
    if (this.isUserLive()) {
      this.stopUserLive();
    }
    this.authService.logout();
    this.router.navigate(['/auth']);
  }

  // Helpers
  formatTime(seconds: number): string {
    return this.audioPlayer.formatTime(seconds);
  }

  onProgressClick(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const percent = ((event.clientX - rect.left) / rect.width) * 100;
    this.audioPlayer.seekToPercent(Math.max(0, Math.min(100, percent)));
  }

  onVolumeClick(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const volume = (event.clientX - rect.left) / rect.width;
    this.audioPlayer.setVolume(Math.max(0, Math.min(1, volume)));
  }

  getFileUrl(path: string | undefined): string {
    if (!path) return 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop';
    return `${environment.apiUrl}/files/${path}`;
  }

  getDisplaySongs(): Song[] {
    const query = this.globalSearchQuery();
    if (query.trim()) {
      return this.searchResults();
    }
    return this.currentPlaylistSongs();
  }

  getCurrentPlaylist(): Playlist | undefined {
    return this.displayPlaylists().find(p => p.id === this.selectedPlaylist());
  }
}
