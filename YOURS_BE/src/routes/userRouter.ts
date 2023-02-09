import { Router } from 'express';
import auth from '../middlewares/auth';
import { userController } from '../controllers';
import upload from '../middlewares/upload';
import { body } from 'express-validator';
import errorValidator from '../middlewares/error/errorValidator';

const router: Router = Router();

router.get('/profile', auth, userController.getUserInfo);
router.patch(
  '/profile/photo',
  upload.single('image'),
  auth,
  userController.updateProfilePhoto,
);
router.patch(
  '/profile/phone',
  [body('phoneNumber').notEmpty()],
  errorValidator,
  auth,
  userController.updateUserPhoneNumber,
);

router.patch(
  '/profile/email',
  [body('email').isEmail().notEmpty()],
  errorValidator,
  auth,
  userController.updateUserEmail,
);

router.patch(
  '/profile/nickname',
  [body('nickname').notEmpty()],
  errorValidator,
  auth,
  userController.updateNickName,
);

router.post(
  '/email/send',
  [body('email').isEmail().notEmpty()],
  errorValidator,
  userController.sendEmailForAuth,
);

export default router;
