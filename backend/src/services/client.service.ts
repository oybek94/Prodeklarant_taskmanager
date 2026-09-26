import { ClientRepository, ClientFilters } from '../repositories/client.repository';
import { computeClientDebt, loadUsdRateAt, UsdRateAt } from './client-debt';

export class ClientService {
  constructor(private clientRepo: ClientRepository) {}

  async getClientsWithBalances(
    filters: ClientFilters,
    pagination: { skip: number; take: number },
    hasDebtFilter?: 'yes' | 'no',
    isAdmin = true
  ) {
    const shouldFilterDebt = hasDebtFilter === 'yes' || hasDebtFilter === 'no';
    
    let clients: any[] = [];
    let total = 0;

    if (shouldFilterDebt) {
      // Fetch all to filter in-memory if we must filter by debt
      clients = await this.clientRepo.findManyWithRelations(filters);
    } else {
      // Paginate at database level
      const [dbClients, dbTotal] = await Promise.all([
        this.clientRepo.findManyWithRelations(filters, pagination.skip, pagination.take),
        this.clientRepo.count(filters),
      ]);
      clients = dbClients;
      total = dbTotal;
    }

    // Calculate balance for each client in deal currency
    const { rateAt, latest } = await loadUsdRateAt();
    const clientsWithBalance = clients.map((client: any) => this.calculateClientBalance(client, rateAt, latest));

    let finalClients = clientsWithBalance;

    // Apply in-memory debt filter if requested
    if (shouldFilterDebt) {
      if (hasDebtFilter === 'yes') {
        finalClients = clientsWithBalance.filter(c => Number(c.balance.toFixed(2)) > 0);
      } else if (hasDebtFilter === 'no') {
        finalClients = clientsWithBalance.filter(c => Number(c.balance.toFixed(2)) <= 0);
      }
      total = finalClients.length;
      finalClients = finalClients.slice(pagination.skip, pagination.skip + pagination.take);
    }

    if (!isAdmin) {
      finalClients = finalClients.map((client: any) => ({
        ...client,
        dealAmount: 0,
        dealAmount_amount_uzs: 0,
        dealAmount_amount_original: 0,
        dealAmount_exchange_rate: 0,
        contractPaymentType: 'CASH_ALL_INCLUSIVE',
        serviceFeeTransferUzs: 0,
        totalDealAmount: 0,
        totalIncome: 0,
        balance: 0,
        initialDebt: 0,
        initialDebtInUzs: 0,
        tasks: client.tasks?.map((t: any) => ({ id: t.id, status: t.status, createdAt: t.createdAt })) || [],
        transactions: []
      }));
    }

    return {
      data: finalClients,
      total,
    };
  }

  /** Qarz — yagona qoida: services/client-debt.ts */
  private calculateClientBalance(client: any, rateAt: UsdRateAt, currentRate: number | null) {
    try {
      const debt = computeClientDebt(client, rateAt, currentRate);
      const dealCurrency = debt.currency;
      const totalDealAmount = debt.totalDeal;
      const totalIncome = debt.totalPaid;
      const initialDebt = debt.initialDebt;
      const balance = totalDealAmount - totalIncome + initialDebt;

      return {
        ...client,
        balance,
        totalDealAmount,
        initialDebt,
        totalIncome,
        balanceCurrency: dealCurrency,
      };
    } catch (clientError) {
      console.error(`Error processing client ${client.id}:`, clientError);
      return {
        ...client,
        balance: 0,
        totalDealAmount: 0,
        totalIncome: 0,
        balanceCurrency: client.dealAmount_currency || client.dealAmountCurrency || 'USD',
      };
    }
  }

  async getClientById(id: number, isAdmin: boolean) {
    const client = await this.clientRepo.findByIdWithRelations(id);
    if (!client) return null;

    const { rateAt, latest } = await loadUsdRateAt();
    const debt = computeClientDebt(client as any, rateAt, latest);
    const totalIncome = debt.totalPaid;
    const totalTasks = client.tasks.length;
    const dealAmount = Number(client.dealAmount || 0);
    const tasksWithPsr = client.tasks.filter((task: any) => task.hasPsr).length;
    const totalDealAmount = debt.totalDeal;
    const balance = debt.debt;

    const tasksByBranch = client.tasks.reduce((acc: any, task: any) => {
      const branchName = task.branch?.name || 'Unknown';
      acc[branchName] = (acc[branchName] || 0) + 1;
      return acc;
    }, {});

    if (!isAdmin) {
      (client as any).dealAmount = 0;
      (client as any).dealAmount_amount_uzs = 0;
      (client as any).dealAmount_amount_original = 0;
      (client as any).dealAmount_exchange_rate = 0;
      (client as any).contractPaymentType = 'CASH_ALL_INCLUSIVE';
      (client as any).serviceFeeTransferUzs = 0;
      (client as any).initialDebt = 0;
      (client as any).initialDebtInUzs = 0;
      (client as any).creditLimit = 0;
      (client as any).transactions = [];
      (client as any).tasks = client.tasks.map((t: any) => ({
        id: t.id,
        status: t.status,
        hasPsr: t.hasPsr,
        branch: t.branch,
        createdAt: t.createdAt
      }));
    }

    return {
      ...client,
      stats: {
        dealAmount: isAdmin ? dealAmount : 0,
        totalDealAmount: isAdmin ? totalDealAmount : 0,
        totalIncome: isAdmin ? totalIncome : 0,
        balance: isAdmin ? balance : 0,
        tasksByBranch,
        totalTasks,
        tasksWithPsr,
      },
    };
  }
}
