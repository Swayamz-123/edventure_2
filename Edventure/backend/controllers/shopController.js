import User from '../models/User.js';
import { SHOP_ITEMS } from '../constant.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Get all available titles and avatars in the Rewards Shop
 */
export const getShopCatalog = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('points title avatar unlockedTitles unlockedAvatars');

  return res.json(
    new ApiResponse(
      200,
      {
        catalog: SHOP_ITEMS,
        userInventory: {
          points: user.points || 0,
          equippedTitle: user.title,
          equippedAvatar: user.avatar,
          unlockedTitles: user.unlockedTitles || ['Novice Scholar'],
          unlockedAvatars: user.unlockedAvatars || ['default']
        }
      },
      'Shop catalog retrieved successfully'
    )
  );
});

/**
 * Purchase a title or avatar using accumulated points
 */
export const purchaseItem = asyncHandler(async (req, res, next) => {
  const { type, itemId } = req.body;

  if (!type || !itemId) {
    return next(new ApiError(400, 'Item type ("title" or "avatar") and itemId are required'));
  }

  // Lookup cost from catalog
  let itemDef = null;
  if (type === 'title') {
    itemDef = SHOP_ITEMS.TITLES.find((t) => t.id === itemId);
  } else if (type === 'avatar') {
    itemDef = SHOP_ITEMS.AVATARS.find((a) => a.id === itemId);
  }

  if (!itemDef) {
    return next(new ApiError(404, `Item "${itemId}" not found in shop catalog`));
  }

  const user = await User.findById(req.user._id);

  try {
    user.purchaseItem(type, itemId, itemDef.cost);
    await user.save();
  } catch (err) {
    return next(new ApiError(400, err.message));
  }

  return res.json(
    new ApiResponse(
      200,
      {
        purchasedItem: itemDef,
        pointsRemaining: user.points,
        unlockedTitles: user.unlockedTitles,
        unlockedAvatars: user.unlockedAvatars
      },
      `Successfully purchased ${itemDef.name}!`
    )
  );
});

/**
 * Equip an unlocked title or avatar
 */
export const equipItem = asyncHandler(async (req, res, next) => {
  const { type, itemId } = req.body;

  if (!type || !itemId) {
    return next(new ApiError(400, 'Item type ("title" or "avatar") and itemId are required'));
  }

  const user = await User.findById(req.user._id);

  try {
    user.equipItem(type, itemId);
    await user.save();
  } catch (err) {
    return next(new ApiError(400, err.message));
  }

  return res.json(
    new ApiResponse(
      200,
      {
        equippedTitle: user.title,
        equippedAvatar: user.avatar
      },
      `Successfully equipped ${itemId}!`
    )
  );
});
