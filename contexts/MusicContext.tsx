import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Song, Playlist, PlayerState } from '../types/music';
import { storageService } from '../services/storageService';
import { playerService } from '../services/playerService';
// Playback status interface
interface PlaybackStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  didJustFinish?: boolean;
}

interface MusicContextType {
  songs: Song[];
  favorites: string[];
  playlists: Playlist[];
  playerState: PlayerState;
  isLoading: boolean;
  
  addSong: (song: Song) => Promise<void>;
  deleteSong: (songId: string) => Promise<void>;
  toggleFavorite: (songId: string) => Promise<void>;
  createPlaylist: (name: string, coverUrl?: string) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  addToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  
  playSong: (song: Song, queue?: Song[], isVideo?: boolean) => Promise<void>;
  switchPlayMode: (isVideo: boolean) => Promise<void>;
  pauseSong: () => Promise<void>;
  resumeSong: () => Promise<void>;
  nextSong: () => Promise<void>;
  previousSong: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  setQueue: (queue: Song[], startIndex?: number) => void;
  
  refreshData: () => Promise<void>;
}

export const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    position: 0,
    duration: 0,
    queue: [],
    currentIndex: 0,
    repeat: 'off',
    shuffle: false,
  });

  useEffect(() => {
    loadData();
    playerService.initialize();
    
    return () => {
      playerService.cleanup();
    };
  }, []);

  useEffect(() => {
    playerService.setOnPlaybackStatusUpdate((status: any) => {
      if (status && status.isLoaded) {
        setPlayerState(prev => ({
          ...prev,
          position: status.positionMillis,
          duration: status.durationMillis || 0,
          isPlaying: status.isPlaying,
        }));

        if (status.didJustFinish) {
          handleSongFinished();
        }
      }
    });
  }, [playerState.repeat, playerState.shuffle, playerState.queue, playerState.currentIndex]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [loadedSongs, loadedFavorites, loadedPlaylists] = await Promise.all([
        storageService.getSongs(),
        storageService.getFavorites(),
        storageService.getPlaylists(),
      ]);
      
      setSongs(loadedSongs);
      setFavorites(loadedFavorites);
      setPlaylists(loadedPlaylists);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    await loadData();
  };

  const addSong = async (song: Song) => {
    await storageService.saveSong(song);
    setSongs(prev => [song, ...prev]);
  };

  const deleteSong = async (songId: string) => {
    const song = songs.find(s => s.id === songId);
    if (song) {
      await storageService.deleteSong(songId);
      setSongs(prev => prev.filter(s => s.id !== songId));
      
      if (playerState.currentSong?.id === songId) {
        await playerService.cleanup();
        setPlayerState(prev => ({ ...prev, currentSong: null, isPlaying: false }));
      }
    }
  };

  const toggleFavorite = async (songId: string) => {
    const isFavorite = await storageService.toggleFavorite(songId);
    if (isFavorite) {
      setFavorites(prev => [...prev, songId]);
    } else {
      setFavorites(prev => prev.filter(id => id !== songId));
    }

    let favoritesPlaylist = playlists.find(p => p.id === 'favorites');
    
    if (!favoritesPlaylist && isFavorite) {
      const newPlaylist = await storageService.createPlaylist('Favoriler', undefined, 'favorites');
      setPlaylists(prev => [...prev, newPlaylist]);
      favoritesPlaylist = newPlaylist;
    }

    if (favoritesPlaylist) {
      if (isFavorite) {
        await storageService.addToPlaylist(favoritesPlaylist.id, songId);
        setPlaylists(prev =>
          prev.map(p =>
            p.id === favoritesPlaylist!.id ? { ...p, songs: [...p.songs, songId] } : p
          )
        );
      } else {
        await storageService.removeFromPlaylist(favoritesPlaylist.id, songId);
        setPlaylists(prev =>
          prev.map(p =>
            p.id === favoritesPlaylist!.id ? { ...p, songs: p.songs.filter(id => id !== songId) } : p
          )
        );
      }
    }
  };

  const createPlaylist = async (name: string, coverUrl?: string) => {
    const newPlaylist = await storageService.createPlaylist(name, coverUrl);
    setPlaylists(prev => [...prev, newPlaylist]);
  };

  const deletePlaylist = async (playlistId: string) => {
    await storageService.deletePlaylist(playlistId);
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
  };

  const addToPlaylist = async (playlistId: string, songId: string) => {
    await storageService.addToPlaylist(playlistId, songId);
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId ? { ...p, songs: [...p.songs, songId] } : p
      )
    );
  };

  const removeFromPlaylist = async (playlistId: string, songId: string) => {
    await storageService.removeFromPlaylist(playlistId, songId);
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId ? { ...p, songs: p.songs.filter(id => id !== songId) } : p
      )
    );
  };

  const playSong = async (song: Song, queue?: Song[], isVideo: boolean = false) => {
    try {
      const status = await playerService.getStatus();
      const wasPlaying = status ? status.isPlaying : false;
      
      if (wasPlaying) {
        await playerService.pause();
      }
      
      await playerService.loadSound(song, isVideo);
      await playerService.play();
      
      const newQueue = queue || songs;
      const index = newQueue.findIndex(s => s.id === song.id);
      
      setPlayerState(prev => ({
        ...prev,
        currentSong: song,
        isPlaying: true,
        queue: newQueue,
        currentIndex: index >= 0 ? index : 0,
        position: 0,
      }));
    } catch (error) {
      console.error('Error playing song:', error);
      throw error;
    }
  };

  const switchPlayMode = async (isVideo: boolean) => {
    try {
      await playerService.switchMode(isVideo);
    } catch (error) {
      console.error('Error switching play mode:', error);
      throw error;
    }
  };

  const pauseSong = async () => {
    await playerService.pause();
    setPlayerState(prev => ({ ...prev, isPlaying: false }));
  };

  const resumeSong = async () => {
    await playerService.play();
    setPlayerState(prev => ({ ...prev, isPlaying: true }));
  };

  const nextSong = async () => {
    const { queue, currentIndex, shuffle } = playerState;
    if (queue.length === 0) return;

    let nextIndex: number;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
    }

    await playSong(queue[nextIndex], queue);
  };

  const previousSong = async () => {
    const { queue, currentIndex, position } = playerState;
    if (queue.length === 0) return;

    if (position > 3000) {
      await seekTo(0);
    } else {
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
      await playSong(queue[prevIndex], queue);
    }
  };

  const seekTo = async (position: number) => {
    await playerService.seekTo(position);
  };

  const toggleRepeat = () => {
    setPlayerState(prev => ({
      ...prev,
      repeat: prev.repeat === 'off' ? 'all' : prev.repeat === 'all' ? 'one' : 'off',
    }));
  };

  const toggleShuffle = () => {
    setPlayerState(prev => ({ ...prev, shuffle: !prev.shuffle }));
  };

  const setQueue = (queue: Song[], startIndex: number = 0) => {
    setPlayerState(prev => ({ ...prev, queue, currentIndex: startIndex }));
  };

  const handleSongFinished = async () => {
    const { repeat, queue, currentIndex } = playerState;

    if (repeat === 'one' && playerState.currentSong) {
      await playSong(playerState.currentSong, queue);
    } else if (repeat === 'all' || currentIndex < queue.length - 1) {
      await nextSong();
    } else {
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  return (
    <MusicContext.Provider
      value={{
        songs,
        favorites,
        playlists,
        playerState,
        isLoading,
        addSong,
        deleteSong,
        toggleFavorite,
        createPlaylist,
        deletePlaylist,
        addToPlaylist,
        removeFromPlaylist,
        playSong,
        switchPlayMode,
        pauseSong,
        resumeSong,
        nextSong,
        previousSong,
        seekTo,
        toggleRepeat,
        toggleShuffle,
        setQueue,
        refreshData,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}
