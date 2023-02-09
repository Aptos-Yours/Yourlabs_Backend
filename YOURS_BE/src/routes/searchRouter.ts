import { Router } from 'express';
import { searchController } from '../controllers';
import auth from '../middlewares/auth';

const router: Router = Router();

router.get('/', auth, searchController.getSearchByName);

export default router;
