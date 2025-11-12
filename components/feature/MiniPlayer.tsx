import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMusic } from '../../hooks/useMusic';
import { theme } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export function MiniPlayer() {
  const router = useRouter();
  const { playerState, pauseSong, resumeSong, nextSong } = useMusic();
  const { currentSong, isPlaying } = playerState;

  if (!currentSong) return null;

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pauseSong();
    } else {
      await resumeSong();
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push('/player')}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={[theme.colors.surface, theme.colors.surfaceLight]}
        style={styles.gradient}
      >
        <Image
          source={{ uri: currentSong.coverUrl }}
          style={styles.cover}
          contentFit="cover"
        />
        
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {currentSong.title}
          </Text>
          <View style={styles.playingIndicator}>
            <View style={styles.waveContainer}>
              {[1, 2, 3].map(i => (
                <View key={i} style={[styles.wave, isPlaying && styles.waveActive]} />
              ))}
            </View>
            <Text style={styles.statusText}>
              {isPlaying ? 'Çalıyor' : 'Duraklatıldı'}
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity onPress={handlePlayPause} style={styles.controlButton}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={28}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={nextSong} style={styles.controlButton}>
            <Ionicons name="play-skip-forward" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...theme.shadows.large,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
  },
  info: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  wave: {
    width: 3,
    height: 12,
    backgroundColor: theme.colors.primary,
    marginRight: 2,
    borderRadius: 2,
    opacity: 0.3,
  },
  waveActive: {
    opacity: 1,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    padding: theme.spacing.sm,
  },
});
