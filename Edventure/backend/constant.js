/**
 * Application Constants
 */
export const DB_NAME = 'edventure';

export const USER_ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin'
};

export const RATE_LIMITS = {
  CHATBOT: 15,
  AUTH: 5,
  AI_GEN: 10
};

export const REDIS_KEYS = {
  GLOBAL_LEADERBOARD: 'leaderboard:global',
  LOBBY_QUEUE_PREFIX: 'lobby:queue:',
  LOBBY_USERS_PREFIX: 'lobby:users:',
  GAME_ROOM_PREFIX: 'gameroom:',
  CACHE_CHATBOT_PREFIX: 'cache:chatbot:',
  CACHE_QUESTIONS_PREFIX: 'cache:questions:'
};

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
};

export const SHOP_ITEMS = {
  TITLES: [
    { id: 'Novice Scholar', name: 'Novice Scholar', cost: 0, description: 'Every journey starts with curiosity.' },
    { id: 'Night Owl', name: 'Night Owl', cost: 150, description: 'Master of midnight study sessions.' },
    { id: 'Math Wizard', name: 'Math Wizard', cost: 250, description: 'Bends formulas and numbers to will.' },
    { id: 'Quantum Titan', name: 'Quantum Titan', cost: 400, description: 'Unravels the secrets of physics.' },
    { id: 'Syllabus Champion', name: 'Syllabus Champion', cost: 600, description: 'Master of the textbook notes.' },
    { id: 'Arena Conqueror', name: 'Arena Conqueror', cost: 1000, description: 'Feared in multiplayer 1v1 battlegrounds.' }
  ],
  AVATARS: [
    { id: 'default', name: 'Standard Scholar', cost: 0, preview: '🎓' },
    { id: 'cyber-coder', name: 'Cyber Hacker', cost: 200, preview: '💻' },
    { id: 'astro-explorer', name: 'Astro Explorer', cost: 350, preview: '🚀' },
    { id: 'neon-samurai', name: 'Neon Samurai', cost: 500, preview: '⚡' },
    { id: 'golden-phoenix', name: 'Golden Phoenix', cost: 850, preview: '🔥' }
  ]
};

