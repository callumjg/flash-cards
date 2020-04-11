import express from 'express';
import * as c from '../controllers/users';

const router = express.Router();

router.post('/login', c.login);

export default router;
