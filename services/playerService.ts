import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Song } from '../types/music';

class PlayerService {
  private sound: Audio.Sound | null = null;
  private videoRef: any = null;
  private currentSong: Song | null = null;
  private isVideoMode: boolean = false;
  private statusCallback: ((status: AVPlaybackStatus) => void) | null = null;

  async initialize(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
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
      await this.showMediaNotification('play');
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
      await this.showMediaNotification('pause');
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
    } catch (error) {
      console.error('Error seeking:', error);
      throw error;
    }
  }

  async getStatus(): Promise<AVPlaybackStatus | null> {
    try {
      if (this.sound && !this.isVideoMode) {
        return await this.sound.getStatusAsync();
      }
      return null;
    } catch (error) {
      console.error('Error getting status:', error);
      return null;
    }
  }

  setOnPlaybackStatusUpdate(callback: (status: AVPlaybackStatus) => void): void {
    this.statusCallback = callback;
  }

  private onPlaybackStatusUpdate(status: AVPlaybackStatus): void {
    if (this.statusCallback) {
      this.statusCallback(status);
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
