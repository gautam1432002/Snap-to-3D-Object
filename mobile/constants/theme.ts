/**
 * Sunlit Playful 3D Studio Design Tokens for Foldly Mobile
 */

export const Colors = {
  // Sunlit Sky & Pastel Rolling Hills
  skyTop: '#4FC3FF',
  skyMid: '#C9EEFF',
  skyLow: '#F2FBFF',
  meadowTint: '#E5F9EA',
  hillLight: '#B4F5BC',
  hillMain: '#84E496',

  // Royal Blue Hero Card & Gold Ring Accent
  heroBlueStart: '#4F9EFF',
  heroBlueEnd: '#246BFD',
  gold: '#FFB020',
  goldDeep: '#FF8C00',

  // Surfaces & Typography
  bg: '#C9EEFF',
  white: '#FFFFFF',
  paper: '#FFFFFF',
  ink: '#0F2238',
  black: '#111827',
  muted: '#64748B',
  softSky: '#EAF6FF',
  softSkyBorder: '#D5ECFF',

  // Craft & Status Accents
  cut: '#FF5A6E',
  fold: '#246BFD',
  ruler: '#FFB020',
  teal: '#10B981',
  sage: '#64748B',

  // Danger Soft Pill
  dangerBg: '#FFE4E6',
  dangerText: '#E11D48',

  // Frosted White Liquid Glass Dock
  glassWhite: 'rgba(255, 255, 255, 0.82)',
  glassRim: 'rgba(255, 255, 255, 0.96)',
  skyShadow: '#0E4C75',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  dockReserve: 108,
};

export const Radii = {
  sm: 12,
  md: 18,
  lg: 26,
  xl: 28,
  pill: 999,
};

export const Typography = {
  hero: {
    fontSize: 26,
    fontWeight: '800' as const,
    lineHeight: 31,
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  title1: {
    fontSize: 24,
    fontWeight: '800' as const,
    lineHeight: 29,
    color: Colors.ink,
    letterSpacing: -0.4,
  },
  title2: {
    fontSize: 18,
    fontWeight: '800' as const,
    lineHeight: 23,
    color: Colors.ink,
  },
  title3: {
    fontSize: 15,
    fontWeight: '800' as const,
    lineHeight: 20,
    color: Colors.ink,
  },
  body: {
    fontSize: 13.5,
    fontWeight: '500' as const,
    lineHeight: 19,
    color: Colors.ink,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    color: Colors.muted,
  },
};
