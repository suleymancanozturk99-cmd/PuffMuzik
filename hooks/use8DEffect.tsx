import { useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';

interface Use8DEffectOptions {
  player: ReturnType<typeof useAudioPlayer> | null;
  isEnabled: boolean;
  speed?: number; // Rotation speed multiplier (0.5 = slow, 2 = fast), default 1
}

/**
 * Custom hook to simulate 8D Audio effect using expo-audio
 * 
 * ⚠️ LIMITATION: expo-audio does not support true stereo panning (stereoPan property).
 * This implementation uses a volume-based pseudo-panning technique:
 * - Volume oscillates to create a spatial movement illusion
 * - Creates left-right sensation through volume modulation
 * 
 * For true stereo panning, you would need:
 * - Native audio modules (iOS: AVAudioEngine, Android: AudioTrack)
 * - Or Web Audio API (browser only)
 * 
 * @param player - The expo-audio player instance from useAudioPlayer()
 * @param isEnabled - Toggle the 8D effect on/off
 * @param speed - Rotation speed (higher = faster rotation)
 */
export function use8DEffect({ player, isEnabled, speed = 1 }: Use8DEffectOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const angleRef = useRef(0);

  useEffect(() => {
    // Clean up previous animation if it exists
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Reset to center when disabled or no player
    if (!player || !isEnabled) {
      if (player) {
        try {
          player.volume = 1.0;
        } catch (err) {
          console.error('Error resetting volume:', err);
        }
      }
      angleRef.current = 0;
      return;
    }

    // Animation settings
    const FPS = 30; // Lower FPS to reduce CPU usage
    const INTERVAL_MS = 1000 / FPS;
    const ROTATION_SPEED = speed * 0.03; // Radians per frame

    // Start the 8D rotation animation
    intervalRef.current = setInterval(async () => {
      try {
        // Increment rotation angle
        angleRef.current += ROTATION_SPEED;
        
        // Keep angle in 0-2π range to prevent overflow
        if (angleRef.current > Math.PI * 2) {
          angleRef.current -= Math.PI * 2;
        }

        // Calculate pan position using sine wave (-1 to 1)
        // This creates smooth left-right oscillation
        const panValue = Math.sin(angleRef.current);
        
        /**
         * PSEUDO-PANNING TECHNIQUE:
         * Since expo-av doesn't support stereoPan, we simulate it with volume.
         * 
         * panValue range: -1 (full left) to 1 (full right)
         * 
         * When panValue = -1 (left):  volume should be high
         * When panValue = 0 (center): volume at maximum
         * When panValue = 1 (right):  volume should be high
         * 
         * We use absolute value to create a "presence" effect
         */
        const volumeModulation = 0.7 + (Math.abs(panValue) * 0.3);
        
        // Apply volume change (this creates a subtle spatial effect)
        player.volume = volumeModulation;

        // Note: For true stereo panning, you would do:
        // player.pan = panValue; (if it existed)
        // But expo-audio doesn't support stereo panning
        
      } catch (error) {
        console.error('8D Effect error:', error);
      }
    }, INTERVAL_MS);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [player, isEnabled, speed]);

  // Return current state for debugging/UI
  return {
    isActive: isEnabled && player !== null,
    currentAngle: angleRef.current,
  };
}

/**
 * USAGE EXAMPLE:
 * 
 * ```tsx
 * import { useAudioPlayer } from 'expo-audio';
 * import { use8DEffect } from '@/hooks/use8DEffect';
 * 
 * function MusicPlayer() {
 *   const player = useAudioPlayer(require('./song.mp3'));
 *   const [is8DEnabled, setIs8DEnabled] = useState(false);
 *   const [rotationSpeed, setRotationSpeed] = useState(1);
 * 
 *   // Apply 8D effect
 *   const { isActive } = use8DEffect({
 *     player,
 *     isEnabled: is8DEnabled,
 *     speed: rotationSpeed,
 *   });
 * 
 *   return (
 *     <View>
 *       <Button title="Play" onPress={() => player.play()} />
 *       <Switch value={is8DEnabled} onValueChange={setIs8DEnabled} />
 *       <Slider 
 *         value={rotationSpeed} 
 *         onValueChange={setRotationSpeed}
 *         minimumValue={0.5}
 *         maximumValue={3}
 *       />
 *       <Text>8D Effect: {isActive ? 'Active' : 'Inactive'}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
