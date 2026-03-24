import { Router } from 'express';
import {
  createDebt,
  getDebts,
  getDebtById,
  updateDebt,
  deleteDebt,
  addDebtPayment,
  getDebtDashboard,
  getDebtPersons
} from '../controllers/debt.controller';

const router = Router();

router.get('/persons', getDebtPersons);
router.get('/dashboard', getDebtDashboard);
router.get('/', getDebts);
router.post('/', createDebt);
router.get('/:id', getDebtById);
router.put('/:id', updateDebt);
router.delete('/:id', deleteDebt);
router.post('/:id/payments', addDebtPayment);

export default router;
