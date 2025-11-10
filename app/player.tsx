import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, FlatList, ScrollView, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { useMusic } from '../hooks/useMusic';
import { playerService } from '../services/playerService';
import { theme } from '../constants/theme';
import { useAlert } from '@/template';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_SIZE = SCREEN_WIDTH * 0.75;

export default function PlayerScreen() {
  const router = useRouter();
  const videoRef = useRef<Video>(null);
  const {
    playerState,
    playlists,
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
  } = useMusic();

  const { currentSong, isPlaying, position, duration, repeat, shuffle } = playerState;
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    const shouldBeVideoMode = currentSong?.hasVideo && playerService.isInVideoMode();
    setIsVideoMode(shouldBeVideoMode || false);
  }, [currentSong?.id]);

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

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: currentSong.coverUrl }}
        style={styles.backgroundImage}
        contentFit="cover"
        blurRadius={50}
      />

      <BlurView intensity={Platform.OS === 'ios' ? 90 : 80} style={styles.blur}>
        <LinearGradient
          colors={['rgba(13, 13, 13, 0.8)', 'rgba(13, 13, 13, 0.95)']}
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
              {isVideoMode && currentSong.hasVideo && currentSong.videoPath ? (
                <View style={styles.videoContainer}>
                  <Video
                    ref={videoRef}
                    source={{ uri: currentSong.videoPath }}
                    style={styles.video}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={isPlaying}
                    isLooping={repeat === 'one'}
                    positionMillis={position}
                    useNativeControls={false}
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
              <Text style={styles.title} numberOfLines={2}>
                {currentSong.title}
              </Text>
              
              <View style={styles.waveContainer}>
                {isPlaying
                  ? [1, 2, 3, 4, 5].map(i => (
                      <View key={i} style={[styles.wave, styles.waveActive]} />
                    ))
                  : null}
              </View>
            </View>

            <View style={styles.progressContainer}>
              <Slider
                style={styles.slider}
                value={currentPosition}
                minimumValue={0}
                maximumValue={Math.max(duration, 1)}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.surfaceLight}
                thumbTintColor={theme.colors.primary}
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
                onPress={() => setShowAddToPlaylist(true)}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleShuffle}
              >
                <Ionicons
                  name="shuffle"
                  size={24}
                  color={shuffle ? theme.colors.primary : theme.colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={previousSong}
              >
                <Ionicons name="play-skip-back" size={36} color={theme.colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlayPause}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryDark]}
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
                <Ionicons name="play-skip-forward" size={36} color={theme.colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleRepeat}
              >
                <Ionicons
                  name={repeat === 'one' ? 'repeat-outline' : 'repeat'}
                  size={24}
                  color={repeat !== 'off' ? theme.colors.primary : theme.colors.textSecondary}
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
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
  },
  wave: {
    width: 4,
    height: 20,
    backgroundColor: theme.colors.primary,
    marginHorizontal: 3,
    borderRadius: 2,
  },
  waveActive: {
    height: 30,
  },
  progressContainer: {
    marginBottom: theme.spacing.xl,
  },
  slider: {
    width: '100%',
    height: 40,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  controlButton: {
    width: 50,
    height: 50,
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
});
