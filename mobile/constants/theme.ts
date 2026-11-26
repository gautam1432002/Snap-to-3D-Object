/**
 * Theme & Design Tokens for Foldly Mobile
 * Ported from reference/master_foldly_photo_to_3d_paper_craft_studio.html
 */

export const Colors = {
  // Backgrounds
  bg: '#0A0B10',
  mat: '#1B3A31',
  matGrid: '#25493E',
  matDeep: '#102620',
  
  // Surfaces & Cards
  surface: '#14171F',
  surfaceCard: 'rgba(20, 26, 23, 0.78)',
  surfaceBorder: 'rgba(255, 255, 255, 0.08)',
  
  // Brand & Craft Accents
  ink: '#EEF6F2',
  muted: '#8BA39B',
  paper: '#FDFDFB',
  cut: '#E63946',          // Red cut line
  fold: '#3B78F0',         // Blue fold line
  ruler: '#F4C430',        // Yellow ruler / CTA accent
  teal: '#2EC4B6',         // AI lift & success
  sage: '#9DB8AF',         // Sage green accent
  
  // Liquid Glass
  glassNav: 'rgba(16, 38, 32, 0.88)',
  glassBorder: 'rgba(255, 255, 255, 0.22)',
  glassHighlight: 'rgba(255, 255, 255, 0.35)',
  glassIndicator: 'rgba(255, 255, 255, 0.16)',
  glassInnerGlow: 'rgba(255, 255, 255, 0.10)',

  // Tab states
  tabInactive: '#8BA39B',
  tabActive: '#F4C430',

  // Status badges
  statusReady: '#2EC4B6',
  statusBuilding: '#F4C430',
  statusBuilt: '#3B78F0',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  bottomBarHeight: 76,
  bottomBarOffset: 92,
};

export const Radii = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 26,
  full: 9999,
};

export const Typography = {
  hero: {
    fontSize: 28,
    fontWeight: '800' as const,
    lineHeight: 34,
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  title1: {
    fontSize: 22,
    fontWeight: '800' as const,
    lineHeight: 28,
    color: Colors.ink,
  },
  title2: {
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 24,
    color: Colors.ink,
  },
  title3: {
    fontSize: 15,
    fontWeight: '700' as const,
    lineHeight: 20,
    color: Colors.ink,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: Colors.ink,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    color: Colors.muted,
  },
  tag: {
    fontSize: 11,
    fontWeight: '700' as const,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  handwritten: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.ruler,
  },
};
