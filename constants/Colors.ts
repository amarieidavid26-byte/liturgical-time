// Warm Orthodox color palette
const warm = {
  background: '#F5F0E8',       // Warm parchment
  surface: '#FFF9F0',          // Warm white for cards
  primary: '#C8A951',          // Liturgical gold
  secondary: '#8B1A2B',        // Deep burgundy
  accent: '#1a237e',           // Royal blue
  text: '#2D2418',             // Warm dark brown
  textSecondary: '#6B5D4F',    // Warm grey-brown
  divider: '#D4C9B8',          // Warm tan
  fasting: '#5B2C6F',          // Purple
  sunday: '#8B1A2B',           // Burgundy
  today: '#C8A951',            // Gold
  red: '#DC143C',              // High severity conflicts
  orange: '#FF8C00',           // Medium severity
  green: '#4CAF50',            // Business meetings
};

const tabBar = {
  background: '#2D2418',       // Dark warm brown
  active: '#C8A951',           // Gold
  inactive: '#8A7D6B',         // Muted warm grey
};

export default {
  light: {
    text: warm.text,
    background: warm.background,
    tint: warm.primary,
    tabIconDefault: tabBar.inactive,
    tabIconSelected: tabBar.active,
  },
  dark: {
    text: '#fff',
    background: '#1a1410',
    tint: warm.primary,
    tabIconDefault: '#666',
    tabIconSelected: warm.primary,
  },
  warm,
  tabBar,
  calendar: {
    sundayBackground: '#F5E6E9',
    fastingBackground: '#F3EAF6',
    feastBackground: '#FFF5E0',
    conflictBackground: '#FFEBEE',
    meetingDot: warm.green,
    orthodoxDot: warm.accent,
    greatFeastDot: warm.primary,
    conflictDot: warm.red,
  },
};
