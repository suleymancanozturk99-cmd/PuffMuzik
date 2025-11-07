import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { storageService } from '../../services/storageService';
import { theme, setThemeColor, getThemeColor } from '../../constants/theme';
import { useAlert } from '@/template';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const [storageInfo, setStorageInfo] = useState<{ used: number; songsCount: number } | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#FF6600');

  const loadStorageInfo = async () => {
    try {
      setIsLoadingStorage(true);
      const info = await storageService.getStorageInfo();
      setStorageInfo({
        used: info.used,
        songsCount: info.songs.length,
      });
    } catch (error) {
      console.error('Error loading storage:', error);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  const loadThemeColor = async () => {
    const color = await getThemeColor();
    setSelectedColor(color);
  };

  useEffect(() => {
    loadStorageInfo();
    loadThemeColor();
  }, []);

  const handleClearCache = () => {
    showAlert(
      'Önbelleği Temizle',
      'Tüm veriler silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              await storageService.clearCache();
              await loadStorageInfo();
              showAlert('Başarılı', 'Önbellek temizlendi. Uygulamayı yeniden başlatın');
            } catch (error) {
              showAlert('Hata', 'Önbellek temizlenemedi');
            }
          },
        },
      ]
    );
  };

  const settingsItems = [
    {
      icon: 'color-palette' as const,
      title: 'Tema Rengi',
      subtitle: 'Ana rengi değiştir',
      onPress: () => setShowColorPicker(true),
    },
    {
      icon: 'server' as const,
      title: 'Depolama',
      subtitle: storageInfo
        ? `${storageService.formatBytes(storageInfo.used)} • ${storageInfo.songsCount} müzik`
        : 'Yükleniyor...',
      onPress: () => {
        if (storageInfo) {
          showAlert(
            'Depolama Bilgisi',
            `Toplam Kullanım: ${storageService.formatBytes(storageInfo.used)}\n\nİndirilen Müzikler: ${storageInfo.songsCount} adet\n\nDepolama alanını temizlemek için \"Önbelleği Temizle\" seçeneğini kullanabilirsiniz.`
          );
        }
      },
    },
    {
      icon: 'trash' as const,
      title: 'Önbelleği Temizle',
      subtitle: 'Tüm verileri sil',
      onPress: handleClearCache,
      danger: true,
    },
  ];

  const handleColorChange = async (color: string) => {
    if (/^#[0-9A-F]{6}$/i.test(color)) {
      setSelectedColor(color);
      await setThemeColor(color);
      showAlert('Başarılı', 'Tema rengi güncellendi. Uygulamayı yeniden başlatın');
      setShowColorPicker(false);
    } else {
      showAlert('Hata', 'Geçersiz renk kodu. Örnek: #FF6600');
    }
  };

  const presetColors = [
    '#FF6600', // Turuncu (varsayılan)
    '#FF0000', // Kırmızı
    '#00FF00', // Yeşil
    '#0000FF', // Mavi
    '#FFFF00', // Sarı
    '#FF00FF', // Mor
    '#00FFFF', // Cyan
    '#FFA500', // Orange
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.settingItem,
                index === settingsItems.length - 1 && styles.settingItemLast,
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconContainer,
                  item.danger && styles.iconContainerDanger,
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={item.danger ? theme.colors.error : theme.colors.primary}
                />
              </View>
              
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, item.danger && styles.settingTitleDanger]}>
                  {item.title}
                </Text>
                <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
              </View>

              {item.icon === 'server' && isLoadingStorage ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textTertiary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Image
            source={{ uri: 'https://cdn-ai.onspace.ai/onspace/project/image/G8JrVe5SWYRusxqFF2RpWt/IMG_5598.jpeg' }}
            style={styles.appIcon}
            contentFit="contain"
          />
          <Text style={styles.version}>Versiyon 1.0</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Müzik tutkusuyla yapıldı 🎵
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showColorPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowColorPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tema Rengi Seçin</Text>
            
            <View style={styles.colorPreview}>
              <View style={[styles.colorPreviewBox, { backgroundColor: selectedColor }]} />
              <Text style={styles.colorPreviewText}>{selectedColor}</Text>
            </View>

            <Text style={styles.colorInputLabel}>Renk Kodu (HEX)</Text>
            <TextInput
              value={selectedColor}
              onChangeText={setSelectedColor}
              placeholder="#FF6600"
              placeholderTextColor={theme.colors.textTertiary}
              style={styles.colorInput}
              maxLength={7}
              autoCapitalize="characters"
            />

            <Text style={styles.presetLabel}>Hazır Renkler</Text>
            <View style={styles.presetColors}>
              {presetColors.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.presetColor,
                    { backgroundColor: color },
                    selectedColor.toUpperCase() === color && styles.presetColorSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowColorPicker(false)}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={() => handleColorChange(selectedColor)}
              >
                <LinearGradient
                  colors={[selectedColor, selectedColor]}
                  style={styles.modalConfirmGradient}
                >
                  <Text style={styles.modalConfirmText}>Uygula</Text>
                </LinearGradient>
              </TouchableOpacity>
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
  content: {
    padding: theme.spacing.lg,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerDanger: {
    backgroundColor: `${theme.colors.error}15`,
  },
  settingInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  settingTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  settingTitleDanger: {
    color: theme.colors.error,
  },
  settingSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  appIcon: {
    width: 180,
    height: 120,
    marginBottom: theme.spacing.md,
  },
  version: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },

  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
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
  colorPreview: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  colorPreviewBox: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  colorPreviewText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  colorInputLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  colorInput: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  presetLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  presetColors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  presetColor: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetColorSelected: {
    borderColor: theme.colors.text,
    borderWidth: 3,
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
});
