import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, unique: true, sparse: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    // Role-Based Access Control (RBAC)
    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      default: 'student',
      index: true
    },

    // Refresh Token for JWT rotation
    refreshToken: {
      type: String
    },

    // Student-specific profile details
    age: { type: Number },
    class: { type: Number }, // 1-12
    subjects: [{ type: String }],
    profilePicture: { type: String },
    points: { type: Number, default: 0, index: true },
    badges: [{ type: String }],

    // Daily Streak Engine
    streak: {
      count: { type: Number, default: 0 },
      lastActiveDate: { type: Date, default: null },
      bestStreak: { type: Number, default: 0 }
    },

    // Battleground statistics for matchmaking & leaderboard
    battleStats: {
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      totalMatches: { type: Number, default: 0 },
      winStreak: { type: Number, default: 0 }
    },

    // Teacher-specific profile details (for syllabus & question bank creation)
    teacherProfile: {
      institution: { type: String },
      department: { type: String },
      verified: { type: Boolean, default: false }
    },

    // Gamified rewards & customizations
    unlockedCourses: {
      type: [Number],
      default: [1]
    },
    avatar: {
      type: String,
      default:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="%23e0e0e0"/><circle cx="32" cy="24" r="14" fill="%23bdbdbd"/><ellipse cx="32" cy="48" rx="20" ry="12" fill="%23bdbdbd"/></svg>'
    },

    // In-Game Economy & Customization (Shop)
    title: {
      type: String,
      default: 'Novice Scholar'
    },
    unlockedTitles: {
      type: [String],
      default: ['Novice Scholar']
    },
    unlockedAvatars: {
      type: [String],
      default: ['default']
    },

    // AI Mistake Notebook (Spaced Repetition)
    mistakes: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PracticeQuestion' },
        questionText: { type: String, required: true },
        subject: { type: String, required: true },
        selectedOption: { type: Number, required: true },
        correctOption: { type: Number, required: true },
        explanation: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now }
      }
    ],

    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for high-frequency search and leaderboard queries
userSchema.index({ points: -1 });

// Virtual: Dynamic Student Level based on Points/XP curve
userSchema.virtual('level').get(function () {
  const points = this.points || 0;
  // Level Formula: Level = floor(sqrt(points / 75)) + 1
  return Math.floor(Math.sqrt(points / 75)) + 1;
});

// Method: Calculate detailed XP and progress towards next level
userSchema.methods.getLevelStats = function () {
  const currentPoints = this.points || 0;
  const currentLevel = Math.floor(Math.sqrt(currentPoints / 75)) + 1;
  const pointsForCurrentLevel = Math.pow(currentLevel - 1, 2) * 75;
  const pointsForNextLevel = Math.pow(currentLevel, 2) * 75;
  const xpNeeded = pointsForNextLevel - pointsForCurrentLevel;
  const xpGainedInLevel = currentPoints - pointsForCurrentLevel;
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpGainedInLevel / xpNeeded) * 100)));

  return {
    level: currentLevel,
    points: currentPoints,
    pointsForCurrentLevel,
    pointsForNextLevel,
    xpGainedInLevel,
    xpNeeded,
    progressPercent
  };
};

// Method: Record daily activity and calculate daily streak
userSchema.methods.recordDailyActivity = function () {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!this.streak) {
    this.streak = { count: 1, lastActiveDate: today, bestStreak: 1 };
    return { streak: 1, bonusAwarded: false };
  }

  if (!this.streak.lastActiveDate) {
    this.streak.count = 1;
    this.streak.lastActiveDate = today;
    this.streak.bestStreak = Math.max(this.streak.bestStreak || 0, 1);
    return { streak: 1, bonusAwarded: false };
  }

  const lastActive = new Date(this.streak.lastActiveDate);
  const lastActiveDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
  const diffTime = today.getTime() - lastActiveDay.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let bonusAwarded = false;

  if (diffDays === 0) {
    // Already logged activity today, streak holds
    return { streak: this.streak.count, bonusAwarded: false };
  } else if (diffDays === 1) {
    // Consecutive day activity: increment streak!
    this.streak.count = (this.streak.count || 0) + 1;
    this.streak.lastActiveDate = today;
    if (this.streak.count > (this.streak.bestStreak || 0)) {
      this.streak.bestStreak = this.streak.count;
    }
    // Award 25 Streak bonus XP
    this.points = (this.points || 0) + 25;
    bonusAwarded = true;

    // Award streak milestone badges
    if (this.streak.count >= 3) this.awardBadge('STREAK_3');
    if (this.streak.count >= 7) this.awardBadge('WEEK_WARRIOR');
    if (this.streak.count >= 30) this.awardBadge('MONTH_MASTER');
  } else {
    // Streak broken: reset to 1
    this.streak.count = 1;
    this.streak.lastActiveDate = today;
  }

  return { streak: this.streak.count, bonusAwarded };
};

// Method: Award a badge if not already unlocked
userSchema.methods.awardBadge = function (badgeName) {
  if (!this.badges) this.badges = [];
  if (!this.badges.includes(badgeName)) {
    this.badges.push(badgeName);
    this.points = (this.points || 0) + 30; // +30 bonus XP on new badge
    return true;
  }
  return false;
};

// Method: Record an incorrect answer into the Mistake Notebook
userSchema.methods.recordMistake = function ({
  questionId,
  questionText,
  subject,
  selectedOption,
  correctOption,
  explanation
}) {
  if (!this.mistakes) this.mistakes = [];

  // Remove older occurrence of the same question if already present
  if (questionId) {
    this.mistakes = this.mistakes.filter(
      (m) => m.questionId && m.questionId.toString() !== questionId.toString()
    );
  }

  // Prepend new mistake
  this.mistakes.unshift({
    questionId,
    questionText,
    subject: (subject || 'General').toLowerCase(),
    selectedOption,
    correctOption,
    explanation: explanation || '',
    createdAt: new Date()
  });

  // Keep latest 50 mistakes for spaced repetition
  if (this.mistakes.length > 50) {
    this.mistakes = this.mistakes.slice(0, 50);
  }
};

// Method: Purchase an item from the Rewards Shop
userSchema.methods.purchaseItem = function (type, itemId, cost) {
  if ((this.points || 0) < cost) {
    throw new Error(`Insufficient points. You need ${cost} points but have ${this.points || 0}`);
  }

  if (type === 'title') {
    if (!this.unlockedTitles) this.unlockedTitles = ['Novice Scholar'];
    if (this.unlockedTitles.includes(itemId)) {
      throw new Error('Title already unlocked');
    }
    this.unlockedTitles.push(itemId);
  } else if (type === 'avatar') {
    if (!this.unlockedAvatars) this.unlockedAvatars = ['default'];
    if (this.unlockedAvatars.includes(itemId)) {
      throw new Error('Avatar already unlocked');
    }
    this.unlockedAvatars.push(itemId);
  } else {
    throw new Error('Invalid item type. Must be "title" or "avatar"');
  }

  this.points -= cost;
  return { pointsRemaining: this.points };
};

// Method: Equip a title or avatar
userSchema.methods.equipItem = function (type, itemId) {
  if (type === 'title') {
    if (!this.unlockedTitles || !this.unlockedTitles.includes(itemId)) {
      throw new Error('You do not own this title');
    }
    this.title = itemId;
  } else if (type === 'avatar') {
    if (!this.unlockedAvatars || !this.unlockedAvatars.includes(itemId)) {
      throw new Error('You do not own this avatar');
    }
    this.avatar = itemId;
  } else {
    throw new Error('Invalid item type');
  }
};

// Password comparison method
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Generate Access Token (Short-Lived)
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      role: this.role
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1d'
    }
  );
};

// Generate Refresh Token (Long-Lived)
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '10d'
    }
  );
};

export default mongoose.model('User', userSchema);
