import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Text, ActivityIndicator, TouchableOpacity, TextInput, Modal, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMusic } from '../../hooks/useMusic';
import { SongItem } from '../../components/feature/SongItem';
import { MiniPlayer } from '../../components/feature/MiniPlayer';
import { EmptyState } from '../../components/ui/EmptyState';
import { theme } from '../../constants/theme';
import { Song, Playlist } from '../../types/music';
import { useAlert } from '@/template';
import * as ImagePicker from 'expo-image-picker';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { songs, favorites, playlists, playerState, playSong, toggleFavorite, deleteSong, createPlaylist, isLoading } = useMusic();
  const { showAlert } = useAlert();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedCover, setSelectedCover] = useState<string | undefined>(undefined);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showAddSongModal, setShowAddSongModal] = useState(false);
  const [activeSection, setActiveSection] = useState<'discover'>('discover');

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSongPress = async (song: Song) => {
    try {
      await playSong(song, songs);
    } catch (error) {
      showAlert('Hata', 'Müzik çalınamadı');
    }
  };

  const handleFavoritePress = async (songId: string) => {
    try {
      await toggleFavorite(songId);
    } catch (error) {
      showAlert('Hata', 'Favori işlemi başarısız oldu');
    }
  };

  const handleDeleteSong = (song: Song) => {
    showAlert('Müziği Sil', `"${song.title}" müziğini silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSong(song.id);
            showAlert('Başarılı', 'Müzik silindi');
          } catch (error) {
            showAlert('Hata', 'Müzik silinemedi');
          }
        },
      },
    ]);
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      showAlert('Uyarı', 'Lütfen bir liste adı girin');
      return;
    }

    try {
      await createPlaylist(newPlaylistName.trim(), selectedCover);
      setNewPlaylistName('');
      setSelectedCover(undefined);
      setShowCreateModal(false);
      showAlert('Başarılı', 'Çalma listesi oluşturuldu');
    } catch (error) {
      showAlert('Hata', 'Liste oluşturulamadı');
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      showAlert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişim izni gerekiyor');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedCover(result.assets[0].uri);
    }
  };

  const getPlaylistCover = (playlist: Playlist) => {
    if (playlist.coverUrl) return playlist.coverUrl;
    if (playlist.songs.length > 0) {
      const firstSong = songs.find(s => s.id === playlist.songs[0]);
      if (firstSong) return firstSong.coverUrl;
    }
    return undefined;
  };

  const handlePlaylistPress = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
  };

  const handleAddSong = async (songId: string) => {
    if (!selectedPlaylist) return;

    try {
      const { addToPlaylist } = useMusic();
      if (selectedPlaylist.songs.includes(songId)) {
        showAlert('Bilgi', 'Bu şarkı zaten listede');
        return;
      }
      await addToPlaylist(selectedPlaylist.id, songId);
      
      setSelectedPlaylist(prev => {
        if (!prev) return prev;
        return { ...prev, songs: [...prev.songs, songId] };
      });
      
      setShowAddSongModal(false);
      showAlert('Başarılı', 'Şarkı listeye eklendi');
    } catch (error) {
      showAlert('Hata', 'Şarkı eklenemedi');
    }
  };

  const handleRemoveSong = async (songId: string) => {
    if (!selectedPlaylist) return;

    try {
      const { removeFromPlaylist } = useMusic();
      await removeFromPlaylist(selectedPlaylist.id, songId);
      
      setSelectedPlaylist(prev => {
        if (!prev) return prev;
        return { ...prev, songs: prev.songs.filter(id => id !== songId) };
      });
      
      showAlert('Başarılı', 'Şarkı listeden çıkarıldı');
    } catch (error) {
      showAlert('Hata', 'Şarkı çıkarılamadı');
    }
  };

  const handleDeletePlaylist = (playlist: Playlist, event?: any) => {
    event?.stopPropagation();
    showAlert('Listeyi Sil', `"${playlist.name}" listesini silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            const { deletePlaylist } = useMusic();
            await deletePlaylist(playlist.id);
            setSelectedPlaylist(null);
            showAlert('Başarılı', 'Liste silindi');
          } catch (error) {
            showAlert('Hata', 'Liste silinemedi');
          }
        },
      },
    ]);
  };

  const getPlaylistSongs = (playlist: Playlist) => {
    return songs.filter(song => playlist.songs.includes(song.id));
  };

  const renderRightActions = (song: Song) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => handleDeleteSong(song)}
    >
      <Ionicons name="trash" size={24} color={theme.colors.text} />
      <Text style={styles.deleteActionText}>Sil</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Image
            source={{ uri: 'https://cdn-ai.onspace.ai/onspace/project/image/PwwPCLV6C3Aovtft37ttao/IMG_5598.jpeg' }}
            style={styles.logoImage}
            contentFit="contain"
          />
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={theme.colors.textTertiary} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Müzik ara..."
              placeholderTextColor={theme.colors.textTertiary}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <View style={styles.sectionsContainer}>

        {activeSection === 'discover' && (
          <ScrollView
            style={styles.playlistsSection}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: playerState.currentSong ? 80 : 20 }}
          >
            <View style={styles.playlistsHeader}>
              <Text style={styles.sectionTitle}>Listeler</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            
            {playlists.length === 0 ? (
              <View style={styles.emptyPlaylistGrid}>
                <Ionicons name="list-outline" size={64} color={theme.colors.textTertiary} />
                <Text style={styles.emptySectionText}>Henüz liste yok</Text>
                <Text style={styles.emptySectionSubtext}>+ butonuna dokunarak yeni liste oluşturun</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.playlistScrollContent}
              >
                {[...playlists, { id: 'add-new', isAddButton: true }].map((item: any) => {
                  if (item.isAddButton) {
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.gridCard}
                        onPress={() => setShowCreateModal(true)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.gridCardCover, styles.gridCardAddButton]}>
                          <Ionicons name="add" size={48} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.gridCardName} numberOfLines={1}>Liste Ekle</Text>
                      </TouchableOpacity>
                    );
                  }
                  const cover = getPlaylistCover(item);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.gridCard}
                      onPress={() => handlePlaylistPress(item)}
                      onLongPress={(e) => handleDeletePlaylist(item, e)}
                      activeOpacity={0.8}
                    >
                      {cover ? (
                        <Image
                          source={{ uri: cover }}
                          style={styles.gridCardCover}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.gridCardCover, styles.gridCardCoverPlaceholder]}>
                          <Ionicons name="musical-notes" size={40} color={theme.colors.primary} />
                        </View>
                      )}
                      <Text style={styles.gridCardName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.gridCardCount}>{item.songs.length} şarkı</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.songsListSection}>
              {filteredSongs.length === 0 ? (
                searchQuery.length > 0 ? (
                  <View style={styles.emptySection}>
                    <Ionicons name="search-outline" size={64} color={theme.colors.textTertiary} />
                    <Text style={styles.emptySectionText}>Sonuç bulunamadı</Text>
                    <Text style={styles.emptySectionSubtext}>Arama kriterlerinize uygun müzik bulunamadı</Text>
                  </View>
                ) : (
                  <View style={styles.emptySection}>
                    <Ionicons name="musical-notes-outline" size={64} color={theme.colors.textTertiary} />
                    <Text style={styles.emptySectionText}>Henüz müzik yok</Text>
                    <Text style={styles.emptySectionSubtext}>İndir sekmesinden YouTube bağlantısı ile müzik indirin</Text>
                  </View>
                )
              ) : (
                filteredSongs.map((item) => (
                  <Swipeable
                    key={item.id}
                    renderRightActions={() => renderRightActions(item)}
                    overshootRight={false}
                  >
                    <SongItem
                      song={item}
                      onPress={() => handleSongPress(item)}
                      onFavoritePress={() => handleFavoritePress(item.id)}
                      isFavorite={favorites.includes(item.id)}
                      isPlaying={playerState.currentSong?.id === item.id && playerState.isPlaying}
                    />
                  </Swipeable>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </View>

      <MiniPlayer />

      <Modal
        visible={showCreateModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yeni Liste Oluştur</Text>
            
            <TouchableOpacity
              style={styles.coverSelector}
              onPress={handlePickImage}
            >
              {selectedCover ? (
                <Image
                  source={{ uri: selectedCover }}
                  style={styles.selectedCover}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="image" size={40} color={theme.colors.textTertiary} />
                  <Text style={styles.coverPlaceholderText}>Kapak Resmi Seç</Text>
                  <Text style={styles.coverPlaceholderSubtext}>(İsteğe bağlı)</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              placeholder="Liste adı girin..."
              placeholderTextColor={theme.colors.textTertiary}
              style={styles.modalInput}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewPlaylistName('');
                  setSelectedCover(undefined);
                }}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleCreatePlaylist}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryDark]}
                  style={styles.modalConfirmGradient}
                >
                  <Text style={styles.modalConfirmText}>Oluştur</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectedPlaylist !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedPlaylist(null)}
      >
        {selectedPlaylist && (
          <View style={styles.playlistModalContainer}>
            <View style={[styles.playlistModalHeader, { paddingTop: insets.top + theme.spacing.md }]}>
              <TouchableOpacity
                onPress={() => setSelectedPlaylist(null)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
              </TouchableOpacity>
              
              <View style={styles.playlistModalHeaderInfo}>
                <Text style={styles.playlistModalTitle}>{selectedPlaylist.name}</Text>
                <Text style={styles.playlistModalSubtitle}>{selectedPlaylist.songs.length} müzik</Text>
              </View>

              <View style={styles.playlistModalActions}>
                <TouchableOpacity
                  onPress={() => setShowAddSongModal(true)}
                  style={styles.modalActionButton}
                >
                  <Ionicons name="add" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
                {selectedPlaylist.id !== 'favorites' && (
                  <TouchableOpacity
                    onPress={() => handleDeletePlaylist(selectedPlaylist)}
                    style={styles.modalActionButton}
                  >
                    <Ionicons name="trash" size={24} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {selectedPlaylist.songs.length === 0 ? (
              <View style={styles.emptyPlaylist}>
                <Ionicons name="musical-notes-outline" size={64} color={theme.colors.textTertiary} />
                <Text style={styles.emptyPlaylistText}>Liste boş</Text>
                <Text style={styles.emptyPlaylistSubtext}>+ butonuna basarak şarkı ekleyin</Text>
              </View>
            ) : (
              <FlatList
                data={getPlaylistSongs(selectedPlaylist)}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={styles.playlistSongItem}>
                    <TouchableOpacity
                      style={styles.songPressArea}
                      onPress={async () => {
                        try {
                          await playSong(item, getPlaylistSongs(selectedPlaylist));
                        } catch (error) {
                          showAlert('Hata', 'Müzik çalınamadı');
                        }
                      }}
                    >
                      <Image
                        source={{ uri: item.coverUrl }}
                        style={styles.playlistSongCover}
                        contentFit="cover"
                      />
                      <View style={styles.playlistSongInfo}>
                        <Text style={styles.playlistSongTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        {item.hasVideo && (
                          <View style={styles.videoBadge}>
                            <Ionicons name="videocam" size={12} color={theme.colors.primary} />
                            <Text style={styles.videoBadgeText}>Klip</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveSong(item.id)}
                      style={styles.removeSongButton}
                    >
                      <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
                contentContainerStyle={styles.playlistSongsList}
              />
            )}
          </View>
        )}
      </Modal>

      <Modal
        visible={showAddSongModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddSongModal(false)}
      >
        <View style={styles.addSongModalOverlay}>
          <View style={styles.addSongModalContent}>
            <View style={styles.addSongModalHeader}>
              <Text style={styles.addSongModalTitle}>Şarkı Ekle</Text>
              <TouchableOpacity onPress={() => setShowAddSongModal(false)}>
                <Ionicons name="close" size={28} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.addSongList}>
              {songs.map(song => (
                <TouchableOpacity
                  key={song.id}
                  style={styles.addSongItem}
                  onPress={() => handleAddSong(song.id)}
                >
                  <Image
                    source={{ uri: song.coverUrl }}
                    style={styles.addSongCover}
                    contentFit="cover"
                  />
                  <View style={styles.addSongInfo}>
                    <Text style={styles.addSongTitle} numberOfLines={1}>
                      {song.title}
                    </Text>
                    {song.hasVideo && (
                      <View style={styles.videoBadge}>
                        <Ionicons name="videocam" size={12} color={theme.colors.primary} />
                        <Text style={styles.videoBadgeText}>Klip</Text>
                      </View>
                    )}
                  </View>
                  {selectedPlaylist?.songs.includes(song.id) && (
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  listContent: {
    padding: theme.spacing.lg,
  },
  deleteAction: {
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '95%',
    marginLeft: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  deleteActionText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    marginTop: theme.spacing.xs,
  },
  sectionsContainer: {
    flex: 1,
  },
  playlistsSection: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  favoritesSection: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  songsSection: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  playlistScrollContent: {
    paddingRight: theme.spacing.lg,
  },
  emptyPlaylistGrid: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  songsListSection: {
    marginTop: theme.spacing.xl,
  },
  playlistsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  addButton: {
    padding: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  emptySection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  emptySectionText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptySectionSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },

  gridCard: {
    width: 120,
    marginRight: theme.spacing.sm,
  },
  gridCardCover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  gridCardCoverPlaceholder: {
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardAddButton: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardName: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  gridCardCount: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  coverSelector: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  selectedCover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
  },
  coverPlaceholderText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  coverPlaceholderSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },
  modalInput: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  modalCancelButton: {
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  modalConfirmButton: {
    overflow: 'hidden',
  },
  modalConfirmGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  playlistModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  playlistModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalCloseButton: {
    padding: theme.spacing.xs,
  },
  playlistModalHeaderInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  playlistModalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  playlistModalSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  playlistModalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  modalActionButton: {
    padding: theme.spacing.xs,
  },
  emptyPlaylist: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyPlaylistText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptyPlaylistSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },
  playlistSongsList: {
    padding: theme.spacing.md,
  },
  playlistSongItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  songPressArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistSongCover: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
  },
  playlistSongInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  playlistSongTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
    alignSelf: 'flex-start',
  },
  videoBadgeText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
    fontWeight: theme.fontWeight.medium,
  },
  removeSongButton: {
    padding: theme.spacing.xs,
  },
  addSongModalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  addSongModalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '80%',
  },
  addSongModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  addSongModalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  addSongList: {
    maxHeight: 400,
  },
  addSongItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  addSongCover: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
  },
  addSongInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  addSongTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
});
