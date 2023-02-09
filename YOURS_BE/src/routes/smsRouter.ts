import { Router } from 'express';
import { body } from 'express-validator';
import errorValidator from '../middlewares/error/errorValidator';
import { userController } from '../controllers';

const router: Router = Router();

router.post(
  '/send',
  [body('phoneNumber').notEmpty()],
  errorValidator,
  userController.sendAuthMessage,
);

export default router;
