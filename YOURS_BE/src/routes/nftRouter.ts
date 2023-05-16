import { Router } from 'express';
import auth from '../middlewares/auth';
import { nftController } from '../controllers';
import { body, param } from 'express-validator';
import errorValidator from '../middlewares/error/errorValidator';
import upload from '../middlewares/upload';

const router: Router = Router();

router.get('/', auth, nftController.getInfoByType);
router.get(
  '/:nftId/detail',
  [param('nftId').notEmpty()],
  errorValidator,
  nftController.getNftDetailInfo,
);
router.get(
  '/:nftId/owners',
  [param('nftId').notEmpty()],
  errorValidator,
  nftController.getNftOwnersInfo,
);
router.post(
  '/',
  upload.single('image'),
  [
    body('nftName').notEmpty(),
    body('description').notEmpty(),
    body('authType').notEmpty(),
    body('options').notEmpty(),
  ],
  errorValidator,
  auth,
  nftController.createNft,
);

router.post(
  '/email',
  [body('nftId').notEmpty(), body('email').isEmail().notEmpty()],
  errorValidator,
  auth,
  nftController.sendAuthMailForNft,
);
router.post(
  '/email/verification',
  [body('code').notEmpty()],
  errorValidator,
  nftController.verifyMailForNft,
);
router.get('/own', auth, nftController.getOwnNftList);
router.get('/creation', auth, nftController.getCreateNftList);
router.post(
  '/verification/photo',
  upload.single('image'),
  [body('nftId').notEmpty()],
  auth,
  nftController.verifyPhotoForNft,
);

router.get(
  '/:nftId/photo',
  [param('nftId').notEmpty()],
  errorValidator,
  auth,
  nftController.getRequestAuthPhoto,
);

router.post(
  '/:nftId/reward',
  [
    param('nftId').notEmpty(),
    body('rewardName').notEmpty(),
    body('description').notEmpty(),
  ],
  errorValidator,
  auth,
  nftController.createReward,
);

router.patch(
  '/:nftId/reward',
  [body('rewardId').notEmpty(), body('rewardName'), body('description')],
  errorValidator,
  auth,
  nftController.updateRewardInfo,
);
router.get('/:rewardId/reward/detail', nftController.getNftRewardDetailInfo);

router.post(
  '/:nftId/transfer',
  [body('walletAddress')],
  errorValidator,
  auth,
  nftController.transferNFT,
);

router.delete(
  '/:nftId/:rewardId',
  [param('rewardId').notEmpty()],
  errorValidator,
  auth,
  nftController.deleteNftReward,
);

router.get('/send', auth, nftController.getNftMoveFlagList);

router.post(
  '/publish',
  [body('nftId').isNumeric().notEmpty()],
  errorValidator,
  auth,
  nftController.publishNFT,
);

export default router;
