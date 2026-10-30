import { Platform } from 'react-native';

export const colors = {
  ink: '#1C2833',
  inkSoft: '#2B3542',
  amber: '#F2A93B',
  bg: '#F7F8FA',
  card: '#FFFFFF',
  border: '#DEE3E8',
  borderStrong: '#C7CFD6',
  text: '#1C2833',
  textSoft: '#4A5A68',
  muted: '#8A97A3',
  success: '#227A54',
  successBg: '#E1F2E9',
  danger: '#B23A2E',
  dangerBg: '#FBE4E1',
  warn: '#A9660F',
  warnBg: '#FDEBD3',
  info: '#2C5EAA',
  infoBg: '#E4EDFB',
  neutral: '#6B7885',
  neutralBg: '#E9ECEF',
};

export const radius = { sm: 8, md: 12, lg: 16, pill: 20 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
