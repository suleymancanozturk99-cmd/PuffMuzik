import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, FlatList, ScrollView, Modal, Animated } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { useMusic } from '../hooks/useMusic';
import { playerService } from '../services/playerService';
import { theme } from '../constants/theme';
import { useAlert } from '@/template';
import * as FileSystem from 'expo-file-system';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_SIZE = SCREEN_WIDTH * 0.75;

export default function PlayerScreen() {
  const router = useRouter();
  const videoPlayer = currentSong?.hasVideo && currentSong?.videoPath 
    ? useVideoPlayer(currentSong.videoPath, player => {
        player.loop = repeat === 'one';
        if (isPlaying) player.play();
        else player.pause();
      })
    : null;
  const {
    playerState,
    playlists,
    favorites,
    playSong,
    pauseSong,
    resumeSong,
    nextSong,
    previousSong,
    seekTo,
    toggleRepeat,
    toggleShuffle,
    switchPlayMode,
    addToPlaylist,
    toggleFavorite,
  } = useMusic();

  const handleFavoritePress = async (songId: string) => {
    try {
      await toggleFavorite(songId);
    } catch (error) {
      showAlert('Hata', 'Favori işlemi başarısız oldu');
    }
  };

  const adjustColor = (color: string, amount: number): string => {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  const { currentSong, isPlaying, position, duration, repeat, shuffle } = playerState;
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSongInfo, setShowSongInfo] = useState(false);
  const [songFileSize, setSongFileSize] = useState<number>(0);
  const [dominantColor, setDominantColor] = useState(theme.colors.primary);
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const waveAnims = useRef([...Array(5)].map(() => new Animated.Value(0))).current;
  const { showAlert } = useAlert();

  useEffect(() => {
    const shouldBeVideoMode = currentSong?.hasVideo && playerService.isInVideoMode();
    setIsVideoMode(shouldBeVideoMode || false);
    
    if (currentSong) {
      extractDominantColor(currentSong.coverUrl);
      getFileSize(currentSong);
    }
  }, [currentSong?.id]);

  useEffect(() => {
    if (isPlaying) {
      startWaveAnimation();
      startScrollAnimation();
    } else {
      stopWaveAnimation();
      scrollAnim.stopAnimation();
    }
  }, [isPlaying]);

  const extractDominantColor = async (imageUrl: string) => {
    try {
      setDominantColor(theme.colors.primary);
    } catch (error) {
      setDominantColor(theme.colors.primary);
    }
  };

  const getFileSize = async (song: typeof currentSong) => {
    if (!song) return;
    try {
      const fileInfo = await FileSystem.getInfoAsync(song.filePath);
      if (fileInfo.exists && 'size' in fileInfo) {
        setSongFileSize(fileInfo.size || 0);
      }
    } catch (error) {
      setSongFileSize(0);
    }
  };

  const startWaveAnimation = () => {
    waveAnims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 300 + index * 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300 + index * 100,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  };

  const stopWaveAnimation = () => {
    waveAnims.forEach(anim => {
      anim.setValue(0);
    });
  };

  const startScrollAnimation = () => {
    Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: -1000,
        duration: 15000,
        useNativeDriver: true,
      })
    ).start();
  };

  const parseSongInfo = (title: string) => {
    const parts = title.split(' - ');
    if (parts.length >= 2) {
      return {
        artist: parts[0].trim(),
        songName: parts.slice(1).join(' - ').trim(),
      };
    }
    return {
      artist: 'Bilinmeyen Sanatçı',
      songName: title,
    };
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  if (!currentSong) {
    router.back();
    return null;
  }

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pauseSong();
    } else {
      await resumeSong();
    }
  };

  const handleSeek = async (value: number) => {
    setIsSeeking(false);
    await seekTo(value);
  };

  const handleModeSwitch = async () => {
    try {
      const newMode = !isVideoMode;
      await switchPlayMode(newMode);
      setIsVideoMode(newMode);
    } catch (error) {
      console.error('Error switching mode:', error);
    }
  };

  const currentPosition = isSeeking ? seekPosition : position;
  const progress = duration > 0 ? currentPosition / duration : 0;

  const songInfo = parseSongInfo(currentSong.title);

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: currentSong.coverUrl }}
        style={styles.backgroundImage}
        contentFit="cover"
        blurRadius={80}
      />

      <BlurView intensity={Platform.OS === 'ios' ? 95 : 85} style={styles.blur}>
        <LinearGradient
          colors={[`${dominantColor}15`, `${dominantColor}30`, 'rgba(13, 13, 13, 0.95)']}
          style={styles.overlay}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={true}
            scrollEventThrottle={16}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-down" size={32} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={styles.coverContainer}>
              {isVideoMode && currentSong.hasVideo && currentSong.videoPath && videoPlayer ? (
                <View style={styles.videoContainer}>
                  <VideoView
                    player={videoPlayer}
                    style={styles.video}
                    nativeControls={false}
                  />
                </View>
              ) : (
                <Image
                  source={{ uri: currentSong.coverUrl }}
                  style={styles.cover}
                  contentFit="cover"
                />
              )}
            </View>

            {currentSong.hasVideo && (
              <View style={styles.modeToggleContainer}>
                <TouchableOpacity
                  style={[styles.modeToggle, !isVideoMode && styles.modeToggleActive]}
                  onPress={() => !isVideoMode || handleModeSwitch()}
                >
                  <Ionicons 
                    name="musical-notes" 
                    size={20} 
                    color={!isVideoMode ? theme.colors.text : theme.colors.textSecondary} 
                  />
                  <Text style={[styles.modeToggleText, !isVideoMode && styles.modeToggleTextActive]}>
                    Müzik
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modeToggle, isVideoMode && styles.modeToggleActive]}
                  onPress={() => isVideoMode || handleModeSwitch()}
                >
                  <Ionicons 
                    name="videocam" 
                    size={20} 
                    color={isVideoMode ? theme.colors.text : theme.colors.textSecondary} 
                  />
                  <Text style={[styles.modeToggleText, isVideoMode && styles.modeToggleTextActive]}>
                    Klip
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.infoContainer}>
              <View style={styles.titleContainer}>
                <Animated.Text 
                  style={[
                    styles.title,
                    { transform: [{ translateX: scrollAnim }] }
                  ]}
                  numberOfLines={1}
                >
                  {songInfo.songName}  •  {songInfo.songName}  •  {songInfo.songName}
                </Animated.Text>
              </View>
              <Text style={styles.artist} numberOfLines={1}>
                {songInfo.artist}
              </Text>
              
              <View style={styles.waveContainer}>
                {[0, 1, 2, 3, 4].map((i) => {
                  const scale = waveAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  });
                  return (
                    <Animated.View
                      key={i}
                      style={[
                        styles.wave,
                        {
                          transform: [{ scaleY: scale }],
                          opacity: isPlaying ? 1 : 0.3,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <TouchableOpacity
                  style={styles.smallControlButton}
                  onPress={toggleShuffle}
                >
                  <Ionicons
                    name="shuffle"
                    size={20}
                    color={shuffle ? dominantColor : theme.colors.textSecondary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.smallControlButton}
                  onPress={toggleRepeat}
                >
                  <Ionicons
                    name={repeat === 'one' ? 'repeat-outline' : 'repeat'}
                    size={20}
                    color={repeat !== 'off' ? dominantColor : theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <Slider
                style={styles.slider}
                value={currentPosition}
                minimumValue={0}
                maximumValue={Math.max(duration, 1)}
                minimumTrackTintColor={dominantColor}
                maximumTrackTintColor={theme.colors.surfaceLight}
                thumbTintColor={dominantColor}
                onValueChange={value => {
                  setIsSeeking(true);
                  setSeekPosition(value);
                }}
                onSlidingComplete={handleSeek}
              />
              <View style={styles.timeContainer}>
                <Text style={styles.time}>
                  {playerService.formatTime(currentPosition)}
                </Text>
                <Text style={styles.time}>
                  {playerService.formatTime(duration)}
                </Text>
              </View>
            </View>

            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => setShowMenu(true)}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={28}
                  color={theme.colors.text}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={previousSong}
              >
                <Ionicons name="play-skip-back" size={40} color={theme.colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlayPause}
              >
                <LinearGradient
                  colors={[dominantColor, adjustColor(dominantColor, -30)]}
                  style={styles.playButtonGradient}
                >
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={40}
                    color={theme.colors.text}
                  />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={nextSong}
              >
                <Ionicons name="play-skip-forward" size={40} color={theme.colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={async () => {
                  if (currentSong) {
                    await handleFavoritePress(currentSong.id);
                  }
                }}
              >
                <Ionicons
                  name={favorites.includes(currentSong.id) ? 'heart' : 'heart-outline'}
                  size={28}
                  color={favorites.includes(currentSong.id) ? dominantColor : theme.colors.text}
                />
              </TouchableOpacity>
            </View>

            {playerState.queue.length > 1 && (
              <View style={styles.queueSection}>
                <TouchableOpacity
                  style={styles.queueHeader}
                  onPress={() => setShowQueue(!showQueue)}
                >
                  <Text style={styles.queueTitle}>Sıradaki Müzikler</Text>
                  <Ionicons
                    name={showQueue ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>

                {showQueue && (
                  <View>
                    {playerState.queue
                      .filter(song => song.id !== currentSong?.id)
                      .map((item, index) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.queueItem}
                          onPress={async () => {
                            try {
                              await playSong(item, playerState.queue);
                            } catch (error) {
                              console.error('Error playing from queue:', error);
                            }
                          }}
                        >
                          <Text style={styles.queueItemNumber}>{index + 1}</Text>
                          <Image
                            source={{ uri: item.coverUrl }}
                            style={styles.queueItemCover}
                            contentFit="cover"
                          />
                          <View style={styles.queueItemInfo}>
                            <Text style={styles.queueItemTitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                            {item.hasVideo && (
                              <View style={styles.queueVideoBadge}>
                                <Ionicons name="videocam" size={10} color={theme.colors.primary} />
                                <Text style={styles.queueVideoBadgeText}>Klip</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </BlurView>

      <Modal
        visible={showAddToPlaylist}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddToPlaylist(false)}
      >
        <View style={styles.playlistModalOverlay}>
          <View style={styles.playlistModalContent}>
            <View style={styles.playlistModalHeader}>
              <Text style={styles.playlistModalTitle}>Listeye Ekle</Text>
              <TouchableOpacity onPress={() => setShowAddToPlaylist(false)}>
                <Ionicons name="close" size={28} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {playlists.length === 0 ? (
              <View style={styles.emptyPlaylistModal}>
                <Ionicons name="list-outline" size={48} color={theme.colors.textTertiary} />
                <Text style={styles.emptyPlaylistText}>Henüz oluşturulmuş bir liste yok</Text>
              </View>
            ) : (
              <ScrollView style={styles.playlistList}>
                {playlists.filter(p => p.id !== 'favorites').map(playlist => (
                  <TouchableOpacity
                    key={playlist.id}
                    style={styles.playlistModalItem}
                    onPress={async () => {
                      if (currentSong) {
                        try {
                          await addToPlaylist(playlist.id, currentSong.id);
                          showAlert('Başarılı', `"${currentSong.title}" ${playlist.name} listesine eklendi`);
                          setShowAddToPlaylist(false);
                        } catch (error) {
                          showAlert('Hata', 'Listeye eklenemedi');
                        }
                      }
                    }}
                  >
                    <Ionicons name="musical-notes" size={24} color={theme.colors.primary} />
                    <View style={styles.playlistModalItemInfo}>
                      <Text style={styles.playlistModalItemName}>{playlist.name}</Text>
                      <Text style={styles.playlistModalItemCount}>{playlist.songs.length} şarkı</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMenu}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMenu(false)}
      >
        <View style={styles.menuModalOverlay}>
          <View style={styles.menuModalContent}>
            <View style={styles.menuModalHeader}>
              <Text style={styles.menuModalTitle}>Seçenekler</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <Ionicons name="close" size={28} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowAddToPlaylist(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={24} color={dominantColor} />
              <Text style={styles.menuItemText}>Listeye Ekle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowSongInfo(true);
              }}
            >
              <Ionicons name="information-circle-outline" size={24} color={dominantColor} />
              <Text style={styles.menuItemText}>Şarkı Detayları</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                showAlert('Yakında', 'Uyku zamanlayıcı özelliği yakında eklenecek');
              }}
            >
              <Ionicons name="moon-outline" size={24} color={dominantColor} />
              <Text style={styles.menuItemText}>Uyku Zamanlayıcı</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Yakında</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowSongInfo(true);
              }}
            >
              <Ionicons name="musical-notes-outline" size={24} color={dominantColor} />
              <Text style={styles.menuItemText}>Şarkı Bilgileri</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSongInfo}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSongInfo(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalContent}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>Şarkı Bilgileri</Text>
              <TouchableOpacity onPress={() => setShowSongInfo(false)}>
                <Ionicons name="close" size={28} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Başlık:</Text>
              <Text style={styles.infoValue}>{songInfo.songName}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sanatçı:</Text>
              <Text style={styles.infoValue}>{songInfo.artist}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Süre:</Text>
              <Text style={styles.infoValue}>{playerService.formatTime(duration)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dosya Boyutu:</Text>
              <Text style={styles.infoValue}>{formatBytes(songFileSize)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Format:</Text>
              <Text style={styles.infoValue}>{currentSong.hasVideo ? 'Video + Ses' : 'Sadece Ses'}</Text>
            </View>

            {currentSong.hasVideo && currentSong.videoQuality && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Video Kalitesi:</Text>
                <Text style={styles.infoValue}>{currentSong.videoQuality}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Eklenme Tarihi:</Text>
              <Text style={styles.infoValue}>
                {new Date(currentSong.addedAt).toLocaleDateString('tr-TR')}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  blur: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  content: {
    paddingTop: 50,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 60,
  },
  coverContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  cover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.large,
  },
  videoContainer: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.large,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
  },
  modeToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  modeToggleActive: {
    backgroundColor: theme.colors.primary,
  },
  modeToggleText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  modeToggleTextActive: {
    color: theme.colors.text,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  titleContainer: {
    width: '100%',
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  artist: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    gap: 4,
  },
  wave: {
    width: 3,
    height: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressContainer: {
    marginBottom: theme.spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  smallControlButton: {
    padding: theme.spacing.xs,
  },
  slider: {
    width: '100%',
    height: 30,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xs,
  },
  time: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  controlButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.round,
    overflow: 'hidden',
    ...theme.shadows.large,
  },
  playButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueSection: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
  },
  queueTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },

  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  queueItemNumber: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
    width: 24,
  },
  queueItemCover: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.xs,
    marginLeft: theme.spacing.sm,
  },
  queueItemInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  queueItemTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  queueVideoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
    alignSelf: 'flex-start',
  },
  queueVideoBadgeText: {
    fontSize: 9,
    color: theme.colors.primary,
    marginLeft: 2,
    fontWeight: theme.fontWeight.medium,
  },
  playlistModalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  playlistModalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '70%',
  },
  playlistModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  playlistModalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  emptyPlaylistModal: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyPlaylistText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  playlistList: {
    maxHeight: 400,
  },
  playlistModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  playlistModalItemInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  playlistModalItemName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  playlistModalItemCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  menuModalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  menuModalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: theme.spacing.xl,
  },
  menuModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuModalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  comingSoonBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.xs,
  },
  comingSoonText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoModalContent: {
    width: '85%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  infoModalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  infoRow: {
    marginBottom: theme.spacing.md,
  },
  infoLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  infoValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.medium,
  },
});
