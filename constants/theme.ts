import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_PRIMARY_COLOR = '#FF6600';

let customPrimaryColor = DEFAULT_PRIMARY_COLOR;

export const setThemeColor = async (color: string) => {
  customPrimaryColor = color;
  await AsyncStorage.setItem('@puff_theme_color', color);
};

export const getThemeColor = async (): Promise<string> => {
  try {
    const color = await AsyncStorage.getItem('@puff_theme_color');
    if (color) {
      customPrimaryColor = color;
      return color;
    }
  } catch (error) {
    console.error('Error loading theme color:', error);
  }
  return DEFAULT_PRIMARY_COLOR;
};

const adjustColor = (color: string, amount: number): string => {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

export const getTheme = () => ({
  colors: {
    primary: customPrimaryColor,
    primaryDark: adjustColor(customPrimaryColor, -30),
    primaryLight: adjustColor(customPrimaryColor, 30),
    background: '#0D0D0D',
    surface: '#1A1A1A',
    surfaceLight: '#2A2A2A',
    text: '#FFFFFF',
    textSecondary: '#AAAAAA',
    textTertiary: '#666666',
    border: '#333333',
    error: '#FF4444',
    success: '#00CC66',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 999,
  },
  
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
  
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
  },
});

export const theme = getTheme();

export type Theme = ReturnType<typeof getTheme>;
