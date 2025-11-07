import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../../types/music';
import { theme } from '../../constants/theme';

interface SongItemProps {
  song: Song;
  onPress: () => void;
  onFavoritePress?: () => void;
  onMorePress?: () => void;
  isFavorite?: boolean;
  isPlaying?: boolean;
}

export function SongItem({
  song,
  onPress,
  onFavoritePress,
  onMorePress,
  isFavorite = false,
  isPlaying = false,
}: SongItemProps) {
  return (
    <TouchableOpacity
      style={[styles.container, isPlaying && styles.playing]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: song.coverUrl }}
        style={styles.cover}
        contentFit="cover"
        transition={200}
      />
      
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {song.title}
        </Text>
        {isPlaying ? (
          <View style={styles.playingIndicator}>
            <Ionicons name="musical-notes" size={14} color={theme.colors.primary} />
            <Text style={styles.playingText}>Çalıyor</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        {onFavoritePress ? (
          <TouchableOpacity onPress={onFavoritePress} style={styles.actionButton}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? theme.colors.primary : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
        
        {onMorePress ? (
          <TouchableOpacity onPress={onMorePress} style={styles.actionButton}>
            <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  playing: {
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  cover: {
    width: 64,
    height: 64,
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
  playingText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
});
