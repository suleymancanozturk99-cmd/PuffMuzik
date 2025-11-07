import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMusic } from '../../hooks/useMusic';
import { downloadService, VideoQuality } from '../../services/downloadService';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../constants/theme';
import { useAlert } from '@/template';

export default function DownloadScreen() {
  const insets = useSafeAreaInsets();
  const { addSong } = useMusic();
  const { showAlert } = useAlert();
  const [url, setUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'audio' | 'video' | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>('720p');

  const qualities = downloadService.getAvailableQualities();

  const handleDownloadPress = () => {
    if (!url.trim()) {
      showAlert('Uyarı', 'Lütfen bir YouTube bağlantısı girin');
      return;
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      showAlert('Uyarı', 'Lütfen geçerli bir YouTube bağlantısı girin');
      return;
    }

    setShowFormatModal(true);
  };

  const handleFormatSelect = (format: 'audio' | 'video') => {
    setSelectedFormat(format);
    setShowFormatModal(false);
    
    if (format === 'video') {
      setShowQualityModal(true);
    } else {
      startDownload(false, undefined);
    }
  };

  const handleQualitySelect = (quality: string) => {
    setSelectedQuality(quality);
    setShowQualityModal(false);
    startDownload(true, quality);
  };

  const startDownload = async (isVideo: boolean, quality?: string) => {

    try {
      setIsDownloading(true);
      setProgress(0);

      const song = await downloadService.downloadFromYouTube(url, {
        isVideo,
        quality,
        onProgress: (downloadProgress) => {
          setProgress(Math.round(downloadProgress));
        },
      });

      await addSong(song);
      
      const message = isVideo ? 'Video başarıyla indirildi' : 'Müzik başarıyla indirildi';
      showAlert('Başarılı', message);
      setUrl('');
      setProgress(0);
      setSelectedFormat(null);
      setSelectedQuality('720p');
    } catch (error) {
      showAlert('Hata', error instanceof Error ? error.message : 'İndirme başarısız oldu');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.title}>YouTube Bağlantısı</Text>
          <Text style={styles.description}>
            İndirmek istediğiniz YouTube müziğinin veya videonun bağlantısını aşağıya yapıştırın
          </Text>

          <Input
            value={url}
            onChangeText={setUrl}
            placeholder="https://youtube.com/watch?v=..."
            style={styles.input}
            multiline
            numberOfLines={3}
          />

          {isDownloading ? (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryLight]}
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>İndiriliyor... %{progress}</Text>
            </View>
          ) : null}

          <Button
            title={isDownloading ? 'İndiriliyor...' : 'İndir'}
            onPress={handleDownloadPress}
            loading={isDownloading}
            disabled={isDownloading || !url.trim()}
            variant="primary"
            size="large"
            style={styles.button}
          />
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Nasıl Kullanılır?</Text>
            <Text style={styles.infoText}>1. YouTube uygulamasını açın</Text>
            <Text style={styles.infoText}>2. İndirmek istediğiniz müziği bulun</Text>
            <Text style={styles.infoText}>3. Paylaş butonuna tıklayın</Text>
            <Text style={styles.infoText}>4. Bağlantıyı kopyalayın</Text>
            <Text style={styles.infoText}>5. Buraya yapıştırın ve indirin</Text>
          </View>
        </View>

        <View style={styles.warningCard}>
          <Ionicons name="warning" size={20} color={theme.colors.error} />
          <Text style={styles.warningText}>
            Lütfen telif haklarına saygı gösterin ve sadece kişisel kullanım için müzik indirin
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showFormatModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFormatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Format Seçin</Text>
            <Text style={styles.modalDescription}>
              Sadece sesi mi yoksa videoyla birlikte mi indirmek istersiniz?
            </Text>

            <TouchableOpacity
              style={styles.formatOption}
              onPress={() => handleFormatSelect('audio')}
            >
              <View style={styles.formatIcon}>
                <Ionicons name="musical-notes" size={32} color={theme.colors.primary} />
              </View>
              <View style={styles.formatInfo}>
                <Text style={styles.formatTitle}>Sadece Ses</Text>
                <Text style={styles.formatSubtitle}>Daha küçük dosya boyutu</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.formatOption}
              onPress={() => handleFormatSelect('video')}
            >
              <View style={styles.formatIcon}>
                <Ionicons name="videocam" size={32} color={theme.colors.primary} />
              </View>
              <View style={styles.formatInfo}>
                <Text style={styles.formatTitle}>Video + Ses</Text>
                <Text style={styles.formatSubtitle}>Klip izleme imkanı</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowFormatModal(false)}
            >
              <Text style={styles.modalCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showQualityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQualityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Video Kalitesi Seçin</Text>
            <Text style={styles.modalDescription}>
              Daha yüksek kalite daha fazla depolama alanı kullanır
            </Text>

            {qualities.map((quality) => (
              <TouchableOpacity
                key={quality.quality}
                style={styles.qualityOption}
                onPress={() => handleQualitySelect(quality.quality)}
              >
                <View style={styles.qualityIcon}>
                  <Ionicons 
                    name="play-circle" 
                    size={24} 
                    color={quality.quality === selectedQuality ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                </View>
                <Text style={[
                  styles.qualityText,
                  quality.quality === selectedQuality && styles.qualityTextActive
                ]}>
                  {quality.label}
                </Text>
                {quality.quality === selectedQuality && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowQualityModal(false)}
            >
              <Text style={styles.modalCancelText}>İptal</Text>
            </TouchableOpacity>
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
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  input: {
    marginBottom: theme.spacing.lg,
  },
  progressContainer: {
    marginBottom: theme.spacing.lg,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.round,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.round,
  },
  progressText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    textAlign: 'center',
    fontWeight: theme.fontWeight.medium,
  },
  button: {
    marginTop: theme.spacing.sm,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  infoContent: {
    marginTop: theme.spacing.md,
  },
  infoTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
  warningCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  warningText: {
    flex: 1,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
    lineHeight: 18,
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
    padding: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  formatIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  formatTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  formatSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  qualityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  qualityIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  qualityTextActive: {
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  modalCancelButton: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
});
