/** Petticoat Phase 1 visual tokens — docs/design/视觉方向.md */

export const colors = {
  cream: '#F7F1E8',
  creamDeep: '#EFE6D8',
  carmine: '#C45C6A',
  carmineDeep: '#A84856',
  gold: '#D4B56A',
  ink: '#3D342C',
  inkMuted: '#7A7066',
  white: '#FFFbf7',
  border: '#E4D9C8',
  danger: '#C45C6A',
  success: '#6B8F71',
  overlay: 'rgba(61, 52, 44, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const fonts = {
  /** System serif as stand-in until custom faces ship */
  display: 'Georgia',
  body: 'System',
} as const;
