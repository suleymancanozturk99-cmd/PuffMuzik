import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Song, Playlist } from '../types/music';

const KEYS = {
  SONGS: '@puff_songs',
  FAVORITES: '@puff_favorites',
  PLAYLISTS: '@puff_playlists',
  LAST_PLAYED: '@puff_last_played',
};

export const storageService = {
  async getSongs(): Promise<Song[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SONGS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting songs:', error);
      return [];
    }
  },

  async saveSong(song: Song): Promise<void> {
    try {
      const songs = await this.getSongs();
      songs.unshift(song);
      await AsyncStorage.setItem(KEYS.SONGS, JSON.stringify(songs));
    } catch (error) {
      console.error('Error saving song:', error);
      throw error;
    }
  },

  async deleteSong(songId: string): Promise<void> {
    try {
      const songs = await this.getSongs();
      const filtered = songs.filter(s => s.id !== songId);
      await AsyncStorage.setItem(KEYS.SONGS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting song:', error);
      throw error;
    }
  },

  async getFavorites(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  },

  async toggleFavorite(songId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      const index = favorites.indexOf(songId);
      
      if (index > -1) {
        favorites.splice(index, 1);
      } else {
        favorites.push(songId);
      }
      
      await AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(favorites));
      return index === -1;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  },

  async getPlaylists(): Promise<Playlist[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PLAYLISTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting playlists:', error);
      return [];
    }
  },

  async createPlaylist(name: string, coverUrl?: string, customId?: string): Promise<Playlist> {
    try {
      const playlists = await this.getPlaylists();
      const newPlaylist: Playlist = {
        id: customId || Date.now().toString(),
        name,
        songs: [],
        createdAt: Date.now(),
        coverUrl,
      };
      playlists.push(newPlaylist);
      await AsyncStorage.setItem(KEYS.PLAYLISTS, JSON.stringify(playlists));
      return newPlaylist;
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  },

  async updatePlaylistCover(playlistId: string, coverUrl: string): Promise<void> {
    try {
      const playlists = await this.getPlaylists();
      const playlist = playlists.find(p => p.id === playlistId);
      
      if (playlist) {
        playlist.coverUrl = coverUrl;
        await AsyncStorage.setItem(KEYS.PLAYLISTS, JSON.stringify(playlists));
      }
    } catch (error) {
      console.error('Error updating playlist cover:', error);
      throw error;
    }
  },

  async deletePlaylist(playlistId: string): Promise<void> {
    try {
      const playlists = await this.getPlaylists();
      const filtered = playlists.filter(p => p.id !== playlistId);
      await AsyncStorage.setItem(KEYS.PLAYLISTS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  },

  async addToPlaylist(playlistId: string, songId: string): Promise<void> {
    try {
      const playlists = await this.getPlaylists();
      const playlist = playlists.find(p => p.id === playlistId);
      
      if (playlist && !playlist.songs.includes(songId)) {
        playlist.songs.push(songId);
        await AsyncStorage.setItem(KEYS.PLAYLISTS, JSON.stringify(playlists));
      }
    } catch (error) {
      console.error('Error adding to playlist:', error);
      throw error;
    }
  },

  async removeFromPlaylist(playlistId: string, songId: string): Promise<void> {
    try {
      const playlists = await this.getPlaylists();
      const playlist = playlists.find(p => p.id === playlistId);
      
      if (playlist) {
        playlist.songs = playlist.songs.filter(id => id !== songId);
        await AsyncStorage.setItem(KEYS.PLAYLISTS, JSON.stringify(playlists));
      }
    } catch (error) {
      console.error('Error removing from playlist:', error);
      throw error;
    }
  },

  async saveLastPlayed(songId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.LAST_PLAYED, songId);
    } catch (error) {
      console.error('Error saving last played:', error);
    }
  },

  async getLastPlayed(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.LAST_PLAYED);
    } catch (error) {
      console.error('Error getting last played:', error);
      return null;
    }
  },

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([KEYS.SONGS, KEYS.FAVORITES, KEYS.PLAYLISTS, KEYS.LAST_PLAYED]);
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  },

  async getStorageInfo(): Promise<{ used: number; total: number; songs: Song[] }> {
    try {
      const songs = await this.getSongs();
      let totalSize = 0;

      for (const song of songs) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(song.filePath);
          if (fileInfo.exists && 'size' in fileInfo) {
            totalSize += fileInfo.size || 0;
          }

          if (song.videoPath) {
            const videoInfo = await FileSystem.getInfoAsync(song.videoPath);
            if (videoInfo.exists && 'size' in videoInfo) {
              totalSize += videoInfo.size || 0;
            }
          }
        } catch (error) {
          console.error('Error getting file info:', error);
        }
      }

      return {
        used: totalSize,
        total: totalSize,
        songs,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { used: 0, total: 0, songs: [] };
    }
  },

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  },
};
