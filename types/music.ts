export interface Song {
  id: string;
  title: string;
  coverUrl: string;
  filePath: string;
  duration: number;
  addedAt: number;
  hasVideo?: boolean;
  videoPath?: string;
  videoQuality?: string;
}

export interface Playlist {
  id: string;
  name: string;
  songs: string[];
  createdAt: number;
  coverUrl?: string;
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  queue: Song[];
  currentIndex: number;
  repeat: 'off' | 'one' | 'all';
  shuffle: boolean;
}

export interface DownloadProgress {
  songId: string;
  progress: number;
  status: 'downloading' | 'processing' | 'completed' | 'error';
}
