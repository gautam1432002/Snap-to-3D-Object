/**
 * Theme & Design Tokens for Foldly Mobile
 * Matches :root variables from reference/master_foldly_photo_to_3d_paper_craft_studio.html
 */

export const Colors = {
  // Cutting Mat Backdrop
  bg: '#1b3a31',
  mat: '#1b3a31',
  mat2: '#25493e',
  matGrid: '#25493e',
  matDeep: '#102620',
  matCardBg: 'rgba(16, 38, 32, 0.78)',
  matCardBorder: 'rgba(157, 184, 175, 0.28)',

  // Tactile Paper & Ink
  paper: '#fdfdfb',
  ink: '#17201d',
  muted: '#53655f',
  inkOnMat: '#eef6f2',
  mutedOnMat: '#9db8af',

  // Craft Accents
  ruler: '#f4c430',
  cut: '#e63946',
  fold: '#3b78f0',
  teal: '#2ec4b6',
  sage: '#9db8af',

  // Liquid Glass
  glassNav: 'rgba(16, 38, 32, 0.82)',
  glassBorder: 'rgba(255, 255, 255, 0.28)',
  glassHighlight: 'rgba(255, 255, 255, 0.45)',
  glassIndicator: 'rgba(255, 255, 255, 0.26)',

  // Tab states
  tabInactive: '#9db8af',
  tabActive: '#f4c430',

  // Status badges
  statusReadyBg: '#dbeafe',
  statusReadyText: '#1e40af',
  statusBuildingBg: '#f4c430',
  statusBuildingText: '#17201d',
  statusBuiltBg: '#2ec4b6',
  statusBuiltText: '#0c2622',

  // Difficulty pills
  easyBg: '#d4f5ee',
  easyText: '#0f5c52',
  medBg: '#fef3c7',
  medText: '#854d0e',
  hardBg: '#fee2e2',
  hardText: '#991b1b',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 15,
  xl: 20,
  xxl: 24,
  bottomBarHeight: 74,
  bottomBarOffset: 102,
};

export const Radii = {
  xs: 6,
  sm: 11,
  md: 15,
  lg: 18,
  xl: 26,
  full: 9999,
};

export const Typography = {
  hero: {
    fontSize: 28,
    fontWeight: '800' as const,
    lineHeight: 31,
    color: Colors.inkOnMat,
    letterSpacing: -0.6,
  },
  title1: {
    fontSize: 23,
    fontWeight: '800' as const,
    lineHeight: 28,
    color: Colors.inkOnMat,
  },
  title2: {
    fontSize: 17,
    fontWeight: '800' as const,
    lineHeight: 22,
    color: Colors.inkOnMat,
  },
  title3: {
    fontSize: 15,
    fontWeight: '800' as const,
    lineHeight: 20,
    color: Colors.inkOnMat,
  },
  body: {
    fontSize: 13.5,
    fontWeight: '500' as const,
    lineHeight: 19,
    color: Colors.inkOnMat,
  },
  caption: {
    fontSize: 11.5,
    fontWeight: '600' as const,
    lineHeight: 16,
    color: Colors.sage,
  },
  handwritten: {
    fontSize: 21,
    fontWeight: '700' as const,
    fontStyle: 'italic' as const,
    color: Colors.ruler,
  },
};
