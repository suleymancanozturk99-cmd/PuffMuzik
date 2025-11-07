import * as FileSystem from 'expo-file-system';
import { Song } from '../types/music';

const API_URL = 'https://www.youtubemp3.ltd/convert';
const VIDEO_API_URL = 'https://www.youtubemp3.ltd/convert-video';

interface ConvertResponse {
  filename: string;
  link: string;
}

export interface VideoQuality {
  quality: string;
  label: string;
}

export const downloadService = {
  getAvailableQualities(): VideoQuality[] {
    return [
      { quality: '1080p', label: '1080p (Full HD)' },
      { quality: '720p', label: '720p (HD)' },
      { quality: '480p', label: '480p (SD)' },
      { quality: '360p', label: '360p (Düşük)' },
    ];
  },

  async downloadFromYouTube(
    youtubeUrl: string,
    options: {
      isVideo: boolean;
      quality?: string;
      onProgress?: (progress: number) => void;
    }
  ): Promise<Song> {
    const { isVideo, quality, onProgress } = options;
    
    try {
      const apiUrl = isVideo ? VIDEO_API_URL : API_URL;
      const body = isVideo
        ? `url=${encodeURIComponent(youtubeUrl)}&quality=${quality || '720p'}`
        : `url=${encodeURIComponent(youtubeUrl)}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      if (!response.ok) {
        throw new Error('API isteği başarısız oldu');
      }

      const data: ConvertResponse = await response.json();
      
      if (!data.link || !data.filename) {
        throw new Error('Geçersiz API yanıtı');
      }

      const songId = Date.now().toString();
      const fileExtension = isVideo ? '.mp4' : '.mp3';
      const fileUri = `${FileSystem.documentDirectory}puff_music_${songId}${fileExtension}`;
      const audioUri = `${FileSystem.documentDirectory}puff_music_${songId}.mp3`;

      // İlk dosyayı indir (video veya ses)
      const downloadResumable = FileSystem.createDownloadResumable(
        data.link,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          const totalProgress = isVideo ? (progress * 50) : (progress * 100);
          onProgress?.(totalProgress);
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (!result) {
        throw new Error('İndirme başarısız oldu');
      }

      // Video modunda ayrıca ses dosyasını da indir
      if (isVideo) {
        const audioDownloadResumable = FileSystem.createDownloadResumable(
          data.link.replace('/video/', '/audio/'),
          audioUri,
          {},
          (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            onProgress?.(50 + (progress * 50));
          }
        );

        const audioResult = await audioDownloadResumable.downloadAsync();
        
        if (!audioResult) {
          throw new Error('Ses dosyası indirilemedi');
        }
      }

      const coverUrl = await this.extractThumbnail(youtubeUrl);

      const song: Song = {
        id: songId,
        title: data.filename.replace(/\.(mp3|mp4)$/i, ''),
        coverUrl,
        filePath: isVideo ? audioUri : result.uri,
        duration: 0,
        addedAt: Date.now(),
        hasVideo: isVideo,
        videoPath: isVideo ? result.uri : undefined,
        videoQuality: isVideo ? quality : undefined,
      };

      return song;
    } catch (error) {
      console.error('Download error:', error);
      throw new Error(error instanceof Error ? error.message : 'İndirme sırasında bir hata oluştu');
    }
  },

  async extractThumbnail(youtubeUrl: string): Promise<string> {
    try {
      const videoIdMatch = youtubeUrl.match(/(?:v=|\/)([\w-]{11})/);
      if (videoIdMatch) {
        return `https://img.youtube.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
      }
      return 'https://via.placeholder.com/500x500/FF6600/FFFFFF?text=Puff+Muzik';
    } catch {
      return 'https://via.placeholder.com/500x500/FF6600/FFFFFF?text=Puff+Muzik';
    }
  },

  async deleteSongFile(filePath: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  },

  async getStorageInfo(): Promise<{ used: number; total: number }> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory || '');
      
      return {
        used: dirInfo.exists && 'size' in dirInfo ? dirInfo.size || 0 : 0,
        total: 0,
      };
    } catch {
      return { used: 0, total: 0 };
    }
  },
};
