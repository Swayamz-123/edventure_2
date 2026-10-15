import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import crypto from 'crypto';
import User from '../models/User.js';
import { redis } from '../redisClient.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { COOKIE_OPTIONS } from '../constant.js';

// Helper function to generate access and refresh tokens and persist refresh token in DB
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, 'Something went wrong while generating access and refresh token');
  }
};

// Initiate Google OAuth 2.0 (Redirect to Google Consent Screen)
export const initiateGoogleAuth = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId.includes('your_google')) {
    return res.status(500).send('Google OAuth Client ID is not configured in .env');
  }

  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://edventure-gtcs.onrender.com'
      : `http://localhost:${process.env.PORT || 5000}`;

  const redirectUri = `${baseUrl}/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent'
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

// Handle Google OAuth 2.0 Callback and issue JWT
export const handleGoogleCallback = asyncHandler(async (req, res, next) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=Google authentication failed`);
  }

  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://edventure-gtcs.onrender.com'
      : `http://localhost:${process.env.PORT || 5000}`;
  const redirectUri = `${baseUrl}/auth/google/callback`;

  // Exchange authorization code for Google access token
  const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });

  const { access_token } = tokenResponse.data;

  // Fetch Google user profile
  const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` }
  });

  const { name, email, picture } = profileResponse.data;

  // Find or create user in MongoDB
  let user = await User.findOne({ email });

  if (!user) {
    const randomPassword = crypto.randomBytes(24).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');

    user = new User({
      name: name || 'Student',
      username: `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`,
      email,
      password: hashedPassword,
      profilePicture: picture,
      avatar: picture,
      role: 'student'
    });
    await user.save();
    redis.zadd('leaderboard:global', 0, user._id.toString()).catch(() => {});
  }

  // Issue our own JWT access & refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  // Set tokens in HttpOnly cookies and redirect to frontend dashboard
  return res
    .cookie('accessToken', accessToken, COOKIE_OPTIONS)
    .cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
    .redirect(`${process.env.FRONTEND_URL}/dashboard`);
});

// Register new user with JWT
export const register = asyncHandler(async (req, res, next) => {
  const { name, username, email, password, age, class: cls, subjects, role } = req.body;

  if (!email || !password || !name) {
    return next(new ApiError(400, 'Please provide name, email, and password'));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ApiError(400, 'An account with this email already exists'));
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    name,
    username,
    email,
    password: hashedPassword,
    age,
    class: cls,
    subjects,
    role: role && ['student', 'teacher'].includes(role) ? role : 'student'
  });
  await user.save();

  // Seed Redis leaderboard with 0 points
  redis.zadd('leaderboard:global', 0, user._id.toString()).catch(() => {});

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  const createdUser = await User.findById(user._id).select('-password -refreshToken');

  return res
    .status(201)
    .cookie('accessToken', accessToken, COOKIE_OPTIONS)
    .cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
    .json(
      new ApiResponse(
        201,
        { user: createdUser, accessToken, refreshToken },
        'User registered successfully'
      )
    );
});

// Login existing user with JWT
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ApiError(400, 'Please provide email and password'));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new ApiError(404, 'User does not exist with this email'));
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    return next(new ApiError(401, 'Invalid user credentials'));
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  // Record daily streak activity
  const streakInfo = user.recordDailyActivity();
  await user.save({ validateBeforeSave: false });

  const loggedInUser = await User.findById(user._id).select('-password -refreshToken');

  return res
    .status(200)
    .cookie('accessToken', accessToken, COOKIE_OPTIONS)
    .cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          levelStats: loggedInUser.getLevelStats(),
          streak: loggedInUser.streak,
          streakBonusAwarded: streakInfo.bonusAwarded,
          accessToken,
          refreshToken
        },
        'Login successful'
      )
    );
});

// Logout user and clear tokens
export const logout = asyncHandler(async (req, res) => {
  if (req.user?._id) {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: { refreshToken: 1 }
      },
      { new: true }
    );
  }

  return res
    .status(200)
    .clearCookie('accessToken', COOKIE_OPTIONS)
    .clearCookie('refreshToken', COOKIE_OPTIONS)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

// Refresh Access Token using Refresh Token
export const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    return next(new ApiError(401, 'Unauthorized request: No refresh token provided'));
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      return next(new ApiError(401, 'Invalid Refresh Token'));
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      return next(new ApiError(401, 'Refresh token is expired or has been rotated'));
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie('accessToken', accessToken, COOKIE_OPTIONS)
      .cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          'Access token refreshed successfully'
        )
      );
  } catch (error) {
    return next(new ApiError(401, error?.message || 'Invalid Refresh Token'));
  }
});

// Get currently logged-in user with dynamic level & streak stats
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -refreshToken');
  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, 'User not found'));
  }

  const streakInfo = user.recordDailyActivity();
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user,
        levelStats: user.getLevelStats(),
        streak: user.streak,
        streakBonusAwarded: streakInfo.bonusAwarded
      },
      'Current user profile retrieved'
    )
  );
});

// Update profile details
export const updateProfile = asyncHandler(async (req, res) => {
  const { username, age, class: cls, subjects, role } = req.body;
  const updateData = { username, age, class: cls, subjects };

  if (role && ['student', 'teacher'].includes(role)) {
    updateData.role = role;
  }

  const updated = await User.findByIdAndUpdate(req.user._id, updateData, {
    new: true,
    runValidators: true
  }).select('-password -refreshToken');

  res.json(new ApiResponse(200, updated, 'Profile updated successfully'));
});

// Helper to generate current weekly leaderboard key with ISO week calculation
export function getLeaderboardKeys(classLevel) {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  const weeklyKey = `leaderboard:weekly:${d.getUTCFullYear()}-W${weekNo}`;

  return {
    globalKey: 'leaderboard:global',
    weeklyKey,
    classKey: classLevel ? `leaderboard:class:${classLevel}` : null
  };
}

// Update points with Multi-ZSET leaderboard sync (Global, Weekly, and Class)
export const updatePoints = asyncHandler(async (req, res, next) => {
  const { points, badge } = req.body;

  // Strict server-side boundary validation: Prevent client XP inflation
  const cleanPoints = parseInt(points, 10);
  if (isNaN(cleanPoints) || cleanPoints <= 0 || cleanPoints > 100) {
    return next(new ApiError(400, 'Invalid points increment: Points awarded per activity must be between 1 and 100'));
  }

  // Whitelist allowable badge achievements
  const ALLOWED_BADGES = ['SCHOLAR_500', 'GRANDMASTER_1500', 'FIRST_WIN', 'HOT_STREAK_3', 'ARENA_TITAN', 'QUIZ_MASTER'];
  const update = { $inc: { points: cleanPoints } };
  if (badge && typeof badge === 'string' && ALLOWED_BADGES.includes(badge)) {
    update.$addToSet = { badges: badge };
  }

  const updatedUser = await User.findByIdAndUpdate(req.user._id, update, { new: true });

  try {
    const { globalKey, weeklyKey, classKey } = getLeaderboardKeys(updatedUser.class);
    const userIdStr = updatedUser._id.toString();

    // 1. Sync global
    await redis.zadd(globalKey, updatedUser.points, userIdStr);

    // 2. Sync weekly (increments this week's score with 8-day auto-expiry)
    await redis.zincrby(weeklyKey, points, userIdStr);
    redis.expire(weeklyKey, 8 * 24 * 3600).catch(() => {});

    // 3. Sync class-level
    if (classKey) {
      await redis.zadd(classKey, updatedUser.points, userIdStr);
    }
  } catch (redisErr) {
    console.error('Redis leaderboard update error:', redisErr.message);
  }

  res.json({ message: 'Updated', points: updatedUser.points });
});

// High-Performance Redis-Backed Segmented Leaderboards (Global, Weekly, Class)
export const getLeaderboard = asyncHandler(async (req, res) => {
  const { type = 'global', classLevel } = req.query;
  const userClass = classLevel || req.user?.class || 10;
  const { globalKey, weeklyKey, classKey } = getLeaderboardKeys(userClass);

  let targetZsetKey = globalKey;
  if (type === 'weekly') targetZsetKey = weeklyKey;
  else if (type === 'class') targetZsetKey = classKey;

  let topUserEntries = [];
  try {
    topUserEntries = await redis.zrevrange(targetZsetKey, 0, 9, 'WITHSCORES');
  } catch (e) {
    console.warn(`Redis read failed for ${targetZsetKey}, falling back to Mongo`);
  }

  let top = [];
  if (topUserEntries && topUserEntries.length > 0) {
    const userIds = [];
    const scoreMap = {};

    for (let i = 0; i < topUserEntries.length; i += 2) {
      const id = topUserEntries[i];
      const score = parseFloat(topUserEntries[i + 1]);
      userIds.push(id);
      scoreMap[id] = score;
    }

    const users = await User.find({ _id: { $in: userIds } })
      .select('name username points badges avatar title class')
      .lean();

    top = userIds
      .map((id) => {
        const u = users.find((user) => user._id.toString() === id);
        if (!u) return null;
        return {
          ...u,
          leaderboardPoints: scoreMap[id] ?? u.points
        };
      })
      .filter(Boolean);
  } else {
    // MongoDB fallback if Redis is warming up
    const query = type === 'class' ? { class: parseInt(userClass, 10) } : {};
    top = await User.find(query)
      .sort({ points: -1 })
      .limit(10)
      .select('name username points badges avatar title class')
      .lean();

    top.forEach((u) => {
      redis.zadd(targetZsetKey, u.points || 0, u._id.toString()).catch(() => {});
    });
  }

  let rank = null;
  if (req.user) {
    try {
      const redisRank = await redis.zrevrank(targetZsetKey, req.user._id.toString());
      rank = redisRank !== null ? redisRank + 1 : null;
    } catch (e) {
      rank = null;
    }
  }

  const totalParticipants = await redis.zcard(targetZsetKey).catch(() => top.length);

  res.json({
    type,
    targetLeaderboard: targetZsetKey,
    top,
    rank,
    totalParticipants
  });
});

// Unlock course with points
export const unlockCourse = asyncHandler(async (req, res, next) => {
  const { newPoints, courseId } = req.body;
  if (typeof newPoints !== 'number' || newPoints < 0 || typeof courseId !== 'number') {
    return next(new ApiError(400, 'Invalid request data for unlocking course'));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { points: newPoints },
      $addToSet: { unlockedCourses: courseId }
    },
    { new: true }
  ).select('-password -refreshToken');

  redis.zadd('leaderboard:global', newPoints, req.user._id.toString()).catch(() => {});
  res.json(updatedUser);
});

// Update Avatar
export const updateAvatar = asyncHandler(async (req, res, next) => {
  const { avatarUrl } = req.body;
  if (!avatarUrl || typeof avatarUrl !== 'string') {
    return next(new ApiError(400, 'Invalid avatar URL provided'));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: avatarUrl } },
    { new: true }
  ).select('-password -refreshToken');

  res.json(updatedUser);
});
