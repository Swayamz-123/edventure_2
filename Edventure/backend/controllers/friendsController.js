import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

// Search users by username or name
export const searchFriends = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Unauthorized'));
  }

  const { q } = req.query;
  if (!q) return res.json([]);

  const users = await User.find({
    $and: [
      {
        $or: [
          { username: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } }
        ]
      },
      { _id: { $ne: req.user._id } }
    ]
  })
    .select('name username _id avatar points')
    .limit(10);

  res.json(users);
});

// Get user's friends list
export const getFriends = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Unauthorized'));
  }

  const user = await User.findById(req.user._id).populate('friends', 'name username _id avatar points');
  res.json(user?.friends || []);
});

// Add friend
export const addFriend = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Unauthorized'));
  }

  const { friendId } = req.params;
  const friend = await User.findById(friendId);
  if (!friend) {
    return next(new ApiError(404, 'User not found'));
  }

  const user = await User.findById(req.user._id);
  if (user.friends.includes(friendId)) {
    return next(new ApiError(400, 'Already friends with this user'));
  }

  user.friends.push(friendId);
  await user.save();

  res.json(new ApiResponse(200, null, 'Friend added successfully'));
});

// Remove friend
export const removeFriend = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Unauthorized'));
  }

  const { friendId } = req.params;
  const user = await User.findById(req.user._id);
  user.friends = user.friends.filter((id) => id.toString() !== friendId);
  await user.save();

  res.json(new ApiResponse(200, null, 'Friend removed successfully'));
});
