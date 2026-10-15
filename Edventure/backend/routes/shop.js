import express from 'express';
import { getShopCatalog, purchaseItem, equipItem } from '../controllers/shopController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyJWT);

router.get('/', getShopCatalog);
router.post('/purchase', purchaseItem);
router.post('/equip', equipItem);

export default router;
