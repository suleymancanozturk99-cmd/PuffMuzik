import { useAudioPlayer, AudioSource } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Song } from '../types/music';

export interface PlaybackStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number | null;
  didJustFinish: boolean;
}

class PlayerService {
  private audioPlayer: ReturnType<typeof useAudioPlayer> | null = null;
  private currentSong: Song | null = null;
  private isVideoMode: boolean = false;
  private statusUpdateCallback: ((status: PlaybackStatus) => void) | null = null;
  private positionInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    try {
      // expo-audio doesn't require audio mode setup like expo-av

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

  createAudioPlayer(): ReturnType<typeof useAudioPlayer> {
    // This is a workaround - in actual implementation, audioPlayer should be created in a component
    // For now, we'll use a simple state management
    return null as any;
  }

  async loadSound(song: Song, isVideo: boolean = false): Promise<void> {
    try {
      // For video mode, we'll handle it separately in the Video component
      // For audio mode, we don't need to do anything here as expo-audio is used in component
      this.currentSong = song;
      this.isVideoMode = isVideo;
    } catch (error) {
      console.error('Error loading sound:', error);
      throw error;
    }
  }

  setAudioPlayer(player: any): void {
    this.audioPlayer = player;
  }

  getAudioPlayer(): any {
    return this.audioPlayer;
  }

  isInVideoMode(): boolean {
    return this.isVideoMode;
  }

  async switchMode(isVideo: boolean): Promise<void> {
    if (!this.currentSong) return;
    this.isVideoMode = isVideo;
  }

  async play(): Promise<void> {
    try {
      // Audio playing is handled in the component with expo-audio
      await this.showMediaNotification('play');
    } catch (error) {
      console.error('Error playing sound:', error);
      throw error;
    }
  }

  async pause(): Promise<void> {
    try {
      // Audio pausing is handled in the component with expo-audio
      await this.showMediaNotification('pause');
    } catch (error) {
      console.error('Error pausing sound:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // Audio stopping is handled in the component
    } catch (error) {
      console.error('Error stopping sound:', error);
      throw error;
    }
  }

  async seekTo(position: number): Promise<void> {
    try {
      // Seeking is handled in the component
    } catch (error) {
      console.error('Error seeking:', error);
      throw error;
    }
  }

  async getStatus(): Promise<PlaybackStatus | null> {
    // Status is tracked in the component
    return null;
  }

  setOnPlaybackStatusUpdate(callback: (status: PlaybackStatus) => void): void {
    this.statusUpdateCallback = callback;
  }

  updateStatus(status: PlaybackStatus): void {
    if (this.statusUpdateCallback) {
      this.statusUpdateCallback(status);
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.positionInterval) {
        clearInterval(this.positionInterval);
        this.positionInterval = null;
      }
      this.audioPlayer = null;
      this.currentSong = null;
      this.isVideoMode = false;
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
