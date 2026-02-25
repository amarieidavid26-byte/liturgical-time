const tintColorLight = '#4169E1'; // Royal blue
const tintColorDark = '#FFD700'; // Gold

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
  },
  orthodox: {
    gold: '#FFD700',        // Major feasts
    royalBlue: '#4169E1',   // Regular Orthodox events
    burgundy: '#800020',    // Fasting periods
    white: '#FFFFFF',       // Background
    lightGray: '#F5F5F5',   // Secondary background
    darkGray: '#333333',    // Text
    red: '#DC143C',         // High severity conflicts
    orange: '#FF8C00',      // Medium severity conflicts
    yellow: '#FFD700',      // Low severity conflicts
    green: '#4CAF50',       // Business meetings
    lightBlue: '#E3F2FD',   // Sunday highlight
    purple: '#9C27B0',      // Special liturgy
  },
  calendar: {
    sundayBackground: '#E3F2FD',
    fastingBackground: '#FFF3E0',
    feastBackground: '#FFF8DC',
    conflictBackground: '#FFEBEE',
    meetingDot: '#4CAF50',
    orthodoxDot: '#4169E1',
    greatFeastDot: '#FFD700',
    conflictDot: '#DC143C',
  }
};
