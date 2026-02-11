import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, ArtistService, SongService, GenreService } from '../../services';
import { Artist, ArtistStats, Song, GenreInfo } from '../../models';
import { environment } from '../../../environments/environment';

interface UploadSongForm {
  title: string;
  albumName: string;
  genreId: string;
  releaseDate: string;
  audioFile: File | null;
  coverArtFile: File | null;
}

@Component({
  selector: 'app-artist-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './artist-admin.component.html',
  styleUrl: './artist-admin.component.scss'
})
export class ArtistAdminComponent implements OnInit {
  // Tabs
  activeTab = signal<'overview' | 'upload' | 'songs' | 'settings'>('overview');

  // Artist data
  artist = signal<Artist | null>(null);
  stats = signal<ArtistStats | null>(null);
  songs = signal<Song[]>([]);
  genres = signal<GenreInfo[]>([]);


  // Upload form
  uploadForm: UploadSongForm = {
    title: '',
    albumName: '',
    genreId: '',
    releaseDate: '',
    audioFile: null,
    coverArtFile: null
  };
  isUploading = signal<boolean>(false);

  // Settings form
  settingsForm = {
    name: '',
    email: '',
    bio: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  constructor(
    public authService: AuthService,
    private artistService: ArtistService,
    private songService: SongService,
    private genreService: GenreService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadArtistData();
    this.loadStats();
    this.loadSongs();
    this.loadGenres();
  }

  loadArtistData(): void {
    this.artistService.getCurrentArtist().subscribe({
      next: (artist) => {
        this.artist.set(artist);
        this.settingsForm.name = artist.name;
        this.settingsForm.email = artist.email;
        this.settingsForm.bio = artist.bio || '';
      },
      error: (err) => console.error('Failed to load artist data', err)
    });
  }

  loadStats(): void {
    this.artistService.getStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: (err) => console.error('Failed to load stats', err)
    });
  }

  loadSongs(): void {
    this.songService.getArtistSongs().subscribe({
      next: (songs) => this.songs.set(songs),
      error: (err) => console.error('Failed to load songs', err)
    });
  }

  loadGenres(): void {
    this.genreService.getAll().subscribe({
      next: (genres) => this.genres.set(genres),
      error: (err) => console.error('Failed to load genres', err)
    });
  }

  // Helpers
  formatDuration(seconds: number): string {
    if (!seconds) return '0s';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m ${Math.floor(seconds % 60)}s`;
  }

  // File handlers
  onAudioFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadForm.audioFile = input.files[0];
    }
  }

  onCoverArtSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadForm.coverArtFile = input.files[0];
    }
  }

  // Upload song
  uploadSong(): void {
    if (!this.uploadForm.title || !this.uploadForm.genreId || !this.uploadForm.audioFile) {
      alert('Please fill in all required fields');
      return;
    }

    this.isUploading.set(true);

    this.songService.upload({
      title: this.uploadForm.title,
      genreId: this.uploadForm.genreId,
      albumName: this.uploadForm.albumName || undefined,
      releaseDate: this.uploadForm.releaseDate ? new Date(this.uploadForm.releaseDate) : undefined
    }, this.uploadForm.audioFile, this.uploadForm.coverArtFile || undefined).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.resetUploadForm();
        this.loadSongs();
        this.loadStats();
        alert('Song uploaded successfully!');
        this.activeTab.set('songs');
      },
      error: (err) => {
        this.isUploading.set(false);
        console.error('Failed to upload song', err);
        alert('Failed to upload song');
      }
    });
  }

  resetUploadForm(): void {
    this.uploadForm = {
      title: '',
      albumName: '',
      genreId: '',
      releaseDate: '',
      audioFile: null,
      coverArtFile: null
    };
  }

  // Delete song
  deleteSong(songId: string): void {
    if (confirm('Are you sure you want to delete this song?')) {
      this.songService.delete(songId).subscribe({
        next: () => {
          this.loadSongs();
          this.loadStats();
        },
        error: (err) => console.error('Failed to delete song', err)
      });
    }
  }

  // Update settings
  saveSettings(): void {
    this.artistService.update({
      name: this.settingsForm.name,
      bio: this.settingsForm.bio
    }).subscribe({
      next: () => {
        this.loadArtistData();
        alert('Settings saved successfully!');
      },
      error: (err) => console.error('Failed to save settings', err)
    });
  }

  updatePassword(): void {
    if (!this.settingsForm.currentPassword || !this.settingsForm.newPassword || !this.settingsForm.confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }

    if (this.settingsForm.newPassword !== this.settingsForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (this.settingsForm.newPassword.length < 6) {
      alert('New password must be at least 6 characters long');
      return;
    }

    this.artistService.changePassword({
      currentPassword: this.settingsForm.currentPassword,
      newPassword: this.settingsForm.newPassword,
      confirmNewPassword: this.settingsForm.confirmPassword
    }).subscribe({
      next: () => {
        alert('Password updated successfully');
        this.settingsForm.currentPassword = '';
        this.settingsForm.newPassword = '';
        this.settingsForm.confirmPassword = '';
      },
      error: (err) => {
        console.error('Failed to update password', err);
        let errorMessage = 'Failed to update password';

        if (err.error) {
          if (err.error.message) {
            errorMessage = err.error.message;
          } else if (err.error.errors) {
            // Handle validation errors from ProblemDetails
            const validationErrors = Object.values(err.error.errors).flat().join('\n');
            if (validationErrors) {
              errorMessage = validationErrors;
            }
          } else if (err.error.title) {
            errorMessage = err.error.title;
          }
        }

        alert(errorMessage);
      }
    });
  }

  // Change profile image
  onProfileImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.artistService.updateProfileImage(input.files[0]).subscribe({
        next: () => {
          this.loadArtistData();
        },
        error: (err) => console.error('Failed to update profile image', err)
      });
    }
  }

  // Helpers
  getFileUrl(path: string | undefined): string {
    if (!path) return 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop';
    return `${environment.apiUrl}/files/${path}`;
  }

  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth']);
  }
}
