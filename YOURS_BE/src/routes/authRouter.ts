import { body } from 'express-validator';
import { Router } from 'express';
import { tokenController } from '../controllers';
import { userController } from '../controllers';
import errorValidator from '../middlewares/error/errorValidator';

const router: Router = Router();

router.post('/kakao', userController.getSocialUser);
router.post(
  '/signup',
  [
    body('snsId').notEmpty(),
    body('nickname').notEmpty(),
    body('profileImage').notEmpty(),
    body('email').notEmpty(),
    body('phone').notEmpty(),
    body('social').notEmpty(),
    body('isMarketing').notEmpty(),
  ],
  errorValidator,
  userController.createUser,
);
router.get('/token', tokenController.getToken);

router.post(
  '/verification',
  [body('authText').notEmpty(), body('authCode').notEmpty()],
  errorValidator,
  userController.verifyAuthCode,
);

export default router;
