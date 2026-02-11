import { Injectable, signal, computed } from '@angular/core';
import { Song } from '../models';
import { SongService } from './song.service';

@Injectable({
  providedIn: 'root'
})
export class AudioPlayerService {
  private audio: HTMLAudioElement;

  private currentSongSignal = signal<Song | null>(null);
  private isPlayingSignal = signal<boolean>(false);
  private currentTimeSignal = signal<number>(0);
  private durationSignal = signal<number>(0);
  private volumeSignal = signal<number>(0.75);
  private isShuffleSignal = signal<boolean>(false);
  private isRepeatSignal = signal<boolean>(false);
  private playlistSignal = signal<Song[]>([]);
  private currentIndexSignal = signal<number>(0);
  private isGhostModeSignal = signal<boolean>(false);

  currentSong = computed(() => this.currentSongSignal());
  isPlaying = computed(() => this.isPlayingSignal());
  currentTime = computed(() => this.currentTimeSignal());
  duration = computed(() => this.durationSignal());
  volume = computed(() => this.volumeSignal());
  isShuffle = computed(() => this.isShuffleSignal());
  isRepeat = computed(() => this.isRepeatSignal());
  playlist = computed(() => this.playlistSignal());
  currentIndex = computed(() => this.currentIndexSignal());
  isGhostMode = computed(() => this.isGhostModeSignal());

  progress = computed(() => {
    const duration = this.durationSignal();
    return duration > 0 ? (this.currentTimeSignal() / duration) * 100 : 0;
  });

  constructor(private songService: SongService) {
    this.audio = new Audio();
    this.setupAudioListeners();
  }

  private setupAudioListeners(): void {
    this.audio.addEventListener('timeupdate', () => {
      this.currentTimeSignal.set(this.audio.currentTime);
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.durationSignal.set(this.audio.duration);
    });

    this.audio.addEventListener('ended', () => {
      // In ghost mode, don't auto-advance - wait for streamer sync
      if (this.isGhostModeSignal()) {
        return;
      }
      if (this.isRepeatSignal()) {
        this.audio.currentTime = 0;
        this.audio.play();
      } else {
        this.next();
      }
    });

    this.audio.addEventListener('play', () => {
      this.isPlayingSignal.set(true);
    });

    this.audio.addEventListener('pause', () => {
      this.isPlayingSignal.set(false);
    });
  }

  playSong(song: Song): void {
    this.currentSongSignal.set(song);
    this.audio.src = this.songService.getStreamUrl(song.id);
    this.audio.volume = this.volumeSignal();
    this.audio.play();
  }

  setPlaylist(songs: Song[], startIndex: number = 0): void {
    this.playlistSignal.set(songs);
    this.currentIndexSignal.set(startIndex);
    if (songs.length > 0) {
      this.playSong(songs[startIndex]);
    }
  }

  play(): void {
    if (this.currentSongSignal()) {
      this.audio.play();
    }
  }

  pause(): void {
    this.audio.pause();
  }

  togglePlayPause(): void {
    if (this.isPlayingSignal()) {
      this.pause();
    } else {
      this.play();
    }
  }

  next(): void {
    const playlist = this.playlistSignal();
    if (playlist.length === 0) return;

    let nextIndex: number;
    if (this.isShuffleSignal()) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = (this.currentIndexSignal() + 1) % playlist.length;
    }

    this.currentIndexSignal.set(nextIndex);
    this.playSong(playlist[nextIndex]);
  }

  previous(): void {
    const playlist = this.playlistSignal();
    if (playlist.length === 0) return;

    // If more than 3 seconds into the song, restart it
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }

    const prevIndex = this.currentIndexSignal() === 0
      ? playlist.length - 1
      : this.currentIndexSignal() - 1;

    this.currentIndexSignal.set(prevIndex);
    this.playSong(playlist[prevIndex]);
  }

  seek(time: number): void {
    this.audio.currentTime = time;
  }

  seekToPercent(percent: number): void {
    const time = (percent / 100) * this.durationSignal();
    this.seek(time);
  }

  setVolume(volume: number): void {
    this.volumeSignal.set(volume);
    this.audio.volume = volume;
  }

  private previousVolume = 0.75;

  toggleMute(): void {
    if (this.volumeSignal() > 0) {
      this.previousVolume = this.volumeSignal();
      this.setVolume(0);
    } else {
      this.setVolume(this.previousVolume);
    }
  }

  toggleShuffle(): void {
    this.isShuffleSignal.set(!this.isShuffleSignal());
  }

  toggleRepeat(): void {
    this.isRepeatSignal.set(!this.isRepeatSignal());
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  recordPlay(): void {
    const song = this.currentSongSignal();
    if (song) {
      const listeningSeconds = Math.floor(this.audio.currentTime);
      this.songService.recordPlay(song.id, listeningSeconds).subscribe();
    }
  }

  // Ghost Mode Methods
  setGhostMode(enabled: boolean): void {
    this.isGhostModeSignal.set(enabled);
  }

  syncToSong(songId: string, position: number, isPaused: boolean = false): void {
    const currentSong = this.currentSongSignal();

    // If we need to play a different song
    if (!currentSong || currentSong.id !== songId) {
      // Create a minimal song object for playback
      // The full song info will come from the playback sync
      this.songService.getById(songId).subscribe({
        next: (song) => {
          this.currentSongSignal.set(song);
          this.audio.src = this.songService.getStreamUrl(song.id);
          this.audio.volume = this.volumeSignal();
          this.audio.currentTime = position;
          if (isPaused) {
            this.audio.pause();
          } else {
            this.audio.play();
          }
        },
        error: () => {
          console.error('Failed to load song for sync');
        }
      });
    } else {
      // Same song, just sync position if it's off by more than 2 seconds (tighter sync)
      const drift = Math.abs(this.audio.currentTime - position);
      if (drift > 2) {
        this.audio.currentTime = position;
      }

      // Handle play/pause state
      if (isPaused) {
        if (!this.audio.paused) {
          this.audio.pause();
        }
      } else {
        if (this.audio.paused) {
          this.audio.play();
        }
      }
    }
  }
}

