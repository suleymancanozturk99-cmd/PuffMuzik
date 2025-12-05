import { Audio } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Song } from '../types/music';

interface PlaybackStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
}

class PlayerService {
  private sound: Audio.Sound | null = null;
  private videoRef: any = null;
  private currentSong: Song | null = null;
  private isVideoMode: boolean = false;
  private isPlaying: boolean = false;
  private position: number = 0;
  private duration: number = 0;
  private statusCallback: ((status: PlaybackStatus) => void) | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    try {
      // Set audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      
      // Notification izinlerini iste
      await Notifications.requestPermissionsAsync();
      
      // Notification handler ayarla
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }

  async loadSound(song: Song, isVideo: boolean = false): Promise<void> {
    try {
      // Clean up previous audio
      if (this.sound && !isVideo) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      this.currentSong = song;
      this.isVideoMode = isVideo;
      this.position = 0;
      this.duration = song.duration;

      // Load new audio if not in video mode
      if (!isVideo && song.filePath) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: song.filePath },
          { shouldPlay: false },
          this.onPlaybackStatusUpdate.bind(this)
        );
        this.sound = sound;
      }
    } catch (error) {
      console.error('Error loading sound:', error);
      throw error;
    }
  }

  setVideoRef(ref: any): void {
    this.videoRef = ref;
  }

  getVideoRef(): any {
    return this.videoRef;
  }

  isInVideoMode(): boolean {
    return this.isVideoMode;
  }

  async switchMode(isVideo: boolean): Promise<void> {
    if (!this.currentSong) return;
    
    const currentPosition = this.position;
    const wasPlaying = this.isPlaying;

    await this.loadSound(this.currentSong, isVideo);
    this.position = currentPosition;
    
    if (wasPlaying) {
      await this.play();
    }
  }

  async play(): Promise<void> {
    try {
      if (this.sound && !this.isVideoMode) {
        await this.sound.playAsync();
      }
      this.isPlaying = true;
      await this.showMediaNotification('play');
      this.emitStatus();
    } catch (error) {
      console.error('Error playing sound:', error);
      throw error;
    }
  }

  async pause(): Promise<void> {
    try {
      if (this.sound && !this.isVideoMode) {
        await this.sound.pauseAsync();
      }
      this.isPlaying = false;
      await this.showMediaNotification('pause');
      this.emitStatus();
    } catch (error) {
      console.error('Error pausing sound:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.sound && !this.isVideoMode) {
        await this.sound.stopAsync();
      }
      this.isPlaying = false;
      this.position = 0;
      this.emitStatus();
    } catch (error) {
      console.error('Error stopping sound:', error);
      throw error;
    }
  }

  async seekTo(position: number): Promise<void> {
    try {
      if (this.sound && !this.isVideoMode) {
        await this.sound.setPositionAsync(position);
      }
      this.position = position;
      this.emitStatus();
    } catch (error) {
      console.error('Error seeking:', error);
      throw error;
    }
  }

  async getStatus(): Promise<PlaybackStatus | null> {
    try {
      if (this.sound && !this.isVideoMode) {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          return {
            isLoaded: true,
            isPlaying: status.isPlaying,
            positionMillis: status.positionMillis,
            durationMillis: status.durationMillis || 0,
          };
        }
      }
      return {
        isLoaded: this.currentSong !== null,
        isPlaying: this.isPlaying,
        positionMillis: this.position,
        durationMillis: this.duration,
      };
    } catch (error) {
      console.error('Error getting status:', error);
      return null;
    }
  }

  setOnPlaybackStatusUpdate(callback: (status: PlaybackStatus) => void): void {
    this.statusCallback = callback;
  }

  private onPlaybackStatusUpdate(status: any): void {
    if (status.isLoaded) {
      this.position = status.positionMillis;
      this.duration = status.durationMillis || 0;
      this.isPlaying = status.isPlaying;
      
      if (this.statusCallback) {
        this.statusCallback({
          isLoaded: true,
          isPlaying: status.isPlaying,
          positionMillis: status.positionMillis,
          durationMillis: status.durationMillis || 0,
        });
      }

      if (status.didJustFinish && this.statusCallback) {
        this.statusCallback({
          isLoaded: true,
          isPlaying: false,
          positionMillis: status.durationMillis || 0,
          durationMillis: status.durationMillis || 0,
        });
      }
    }
  }

  private emitStatus(): void {
    if (this.statusCallback) {
      this.statusCallback({
        isLoaded: this.currentSong !== null,
        isPlaying: this.isPlaying,
        positionMillis: this.position,
        durationMillis: this.duration,
      });
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }
      this.currentSong = null;
      this.isVideoMode = false;
      this.videoRef = null;
      this.isPlaying = false;
      this.position = 0;
      this.duration = 0;
      await this.dismissMediaNotification();
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  }

  async showMediaNotification(state: 'play' | 'pause'): Promise<void> {
    try {
      if (!this.currentSong) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: this.currentSong.title,
          body: state === 'play' ? 'Şu anda çalıyor' : 'Duraklatıldı',
          data: { songId: this.currentSong.id },
          sound: false,
          sticky: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          categoryIdentifier: 'music_control',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  async dismissMediaNotification(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }

  getCurrentSong(): Song | null {
    return this.currentSong;
  }

  formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

export const playerService = new PlayerService();
