import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  updateCompanySettingsSchema,
  createFiscalYearSchema,
  updateSystemSettingSchema,
  createApprovalWorkflowSchema,
  approvalActionSchema,
  createRoleSchema,
  updateRoleSchema,
  createChartAccountSchema,
  createCashAccountSchema,
  updateCashAccountSchema
} from '../types/management';
import { AuthRequest } from '../middleware/auth';
import { ManagementService } from '../services/management';

const prisma = new PrismaClient();
const managementService = new ManagementService();

export class ManagementController {
  // ... (everything above stays unchanged)

  // Cash Account Management
  async getCashAccountsManagement(req: AuthRequest, res: Response) {
    try {
      const accounts = await prisma.cashAccount.findMany({
        include: {
          chartOfAccount: {
            select: { code: true, name: true }
          }
        },
        orderBy: { code: 'asc' }
      });

      const accountsWithAlias = accounts.map(account => ({
        ...account,
        glAccount: account.chartOfAccount
      }));

      res.json({ accounts: accountsWithAlias });
    } catch (error) {
      console.error('Get cash accounts management error:', error);
      res.status(500).json({ error: 'Failed to fetch cash accounts' });
    }
  }

  async createCashAccountManagement(req: AuthRequest, res: Response) {
    try {
      const validatedData = createCashAccountSchema.parse(req.body);
      
      const account = await prisma.cashAccount.create({
        data: {
          code: validatedData.code,
          name: validatedData.name,
          accountType: validatedData.accountType,
          accountNumber: validatedData.accountNumber,
          bankName: validatedData.bankName,
          chartOfAccountId: validatedData.glAccountId, // <-- use correct FK
          balance: validatedData.balance || 0
        },
        include: {
          chartOfAccount: {
            select: { code: true, name: true }
          }
        }
      });

      res.status(201).json({
        ...account,
        glAccount: account.chartOfAccount
      });
    } catch (error) {
      console.error('Create cash account management error:', error);
      res.status(400).json({ error: 'Failed to create cash account' });
    }
  }

  async updateCashAccountManagement(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateCashAccountSchema.parse(req.body);
      
      const account = await prisma.cashAccount.update({
        where: { id },
        data: {
          name: validatedData.name,
          accountType: validatedData.accountType,
          accountNumber: validatedData.accountNumber,
          bankName: validatedData.bankName,
          chartOfAccountId: validatedData.glAccountId, // <-- use correct FK
          balance: validatedData.balance,
          isActive: validatedData.isActive??true
        },
        include: {
          chartOfAccount: {
            select: { code: true, name: true }
          }
        }
      });

      res.json({
        ...account,
        glAccount: account.chartOfAccount
      });
    } catch (error) {
      console.error('Update cash account management error:', error);
      res.status(400).json({ error: 'Failed to update cash account' });
    }
  }

  async deleteCashAccountManagement(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      
      // Check if account has transactions
      const transactionCount = await prisma.cashTransaction.count({
        where: { cashAccountId: id }
      });

      if (transactionCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete cash account with existing transactions' 
        });
      }

      // Check if account has non-zero balance
      const account = await prisma.cashAccount.findUnique({
        where: { id },
        select: { balance: true }
      });

      if (account && Number(account.balance) !== 0) {
        return res.status(400).json({ 
          error: 'Cannot delete cash account with non-zero balance' 
        });
      }

      await prisma.cashAccount.delete({
        where: { id }
      });

      res.json({ message: 'Cash account deleted successfully' });
    } catch (error) {
      console.error('Delete cash account management error:', error);
      res.status(400).json({ error: 'Failed to delete cash account' });
    }
  }

  // Audit Log Management
  
async getAuditLogs(req: AuthRequest, res: Response) {
  try {
    // console.log('req.query:', req.query);

    // Only General Manager can access audit logs
    if (!req.user?.roles.includes('General Manager')) {
      return res.status(403).json({ error: 'Only General Manager can access audit logs' });
    }

    const { 
      page = 1, 
      limit = 20, 
      userId,
      action,
      entity,
      dateFrom,
      dateTo
    } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);

    //  Build filters with proper casting
    const where: any = {};
   if (userId) where.userId = String(userId);

if (action) where.action = String(action).toUpperCase();
if (entity) where.entity = String(entity).toUpperCase();

if (dateFrom || dateTo) {
  where.createdAt = {};
  if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
  if (dateTo) {
    const endDate = new Date(dateTo as string);
    endDate.setHours(23, 59, 59, 999); // include the full day
    where.createdAt.lte = endDate;
  }
}
 {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }
   console.log("Final Prisma where:", JSON.stringify(where, null, 2));


    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          user: { select: { name: true, email: true } },
          //warehouse: { select: { name: true } },  
         // vendor: { select: { name: true } },      //  resolve vendorId → vendor.name
         // customer: { select: { name: true } },    //  resolve customerId → customer.name
              //  resolve productId → product.name
          // add more relations if your audit log can point to other entities
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      entries,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
}

  // async getAuditLogs(req: AuthRequest, res: Response) {
  //   try {
  //     // Only General Manager can access audit logs
  //     if (!req.user?.roles.includes('General Manager')) {
  //       return res.status(403).json({ error: 'Only General Manager can access audit logs' });
  //     }

  //     const { 
  //       page = 1, 
  //       limit = 20, 
  //       userId,
  //       action,
  //       entity,
  //       dateFrom,
  //       dateTo
  //     } = req.query;
      
  //     const skip = (Number(page) - 1) * Number(limit);

  //     const where: any = {};
  //     if (userId) where.userId = userId;
  //     if (action) where.action = action;
  //     if (entity) where.entity = entity;
  //     if (dateFrom || dateTo) {
  //       where.createdAt = {};
  //       if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
  //       if (dateTo) where.createdAt.lte = new Date(dateTo as string);
  //     }

  //     const [entries, total] = await Promise.all([
  //       prisma.auditLog.findMany({
  //         where,
  //         skip,
  //         take: Number(limit),
  //         include: {
  //           user: {
  //             select: { name: true, email: true }
  //           }
  //         },
  //         orderBy: { createdAt: 'desc' }
  //       }),
  //       prisma.auditLog.count({ where })
  //     ]);

  //     res.json({
  //       entries,
  //       pagination: {
  //         page: Number(page),
  //         limit: Number(limit),
  //         total,
  //         pages: Math.ceil(total / Number(limit))
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Get audit logs error:', error);
  //     res.status(500).json({ error: 'Failed to fetch audit logs' });
  //   }
  // }


    // Company Settings
  async getCompanySettings(req: AuthRequest, res: Response) {
    try {
      const settings = await managementService.getCompanySettings();
      res.json(settings);
    } catch (error) {
      console.error('Get company settings error:', error);
      res.status(500).json({ error: 'Failed to fetch company settings' });
    }
  }

  async updateCompanySettings(req: AuthRequest, res: Response) {
    try {
      const validatedData = updateCompanySettingsSchema.parse(req.body);
      await managementService.updateCompanySettings(validatedData, req.user!.id);
      res.json({ message: 'Company settings updated successfully' });
    } catch (error) {
      console.error('Update company settings error:', error);
      res.status(400).json({ error: 'Failed to update company settings' });
    }
  }

  // System Settings
  async getSystemSettings(req: AuthRequest, res: Response) {
    try {
      const { category } = req.query;
      const settings = await managementService.getSystemSettings(category as string);
      res.json({ settings });
    } catch (error) {
      console.error('Get system settings error:', error);
      res.status(500).json({ error: 'Failed to fetch system settings' });
    }
  }

  async updateSystemSetting(req: AuthRequest, res: Response) {
    try {
      const validatedData = updateSystemSettingSchema.parse(req.body);
      const setting = await managementService.updateSystemSetting(validatedData, req.user!.id);
      res.json(setting);
    } catch (error) {
      console.error('Update system setting error:', error);
      res.status(400).json({ error: 'Failed to update system setting' });
    }
  }

  async getCostingPolicy(req: AuthRequest, res: Response) {
    try {
      const policy = await managementService.getCostingPolicy();
      res.json({ costingMethod: policy });
    } catch (error) {
      console.error('Get costing policy error:', error);
      res.status(500).json({ error: 'Failed to fetch costing policy' });
    }
  }

  async updateCostingPolicy(req: AuthRequest, res: Response) {
    try {
      const { method } = req.body;
      if (!['FIFO', 'WEIGHTED_AVG'].includes(method)) {
        return res.status(400).json({ error: 'Invalid costing method' });
      }

      await managementService.updateCostingPolicy(method, req.user!.id);
      res.json({ message: 'Costing policy updated successfully' });
    } catch (error) {
      console.error('Update costing policy error:', error);
      res.status(400).json({ error: 'Failed to update costing policy' });
    }
  }

  // Fiscal Calendar
  async getFiscalYears(req: AuthRequest, res: Response) {
    try {
      const fiscalYears = await managementService.getFiscalYears();
      res.json({ fiscalYears });
    } catch (error) {
      console.error('Get fiscal years error:', error);
      res.status(500).json({ error: 'Failed to fetch fiscal years' });
    }
  }

  async createFiscalYear(req: AuthRequest, res: Response) {
    try {
      const validatedData = createFiscalYearSchema.parse(req.body);
      const fiscalYear = await managementService.createFiscalYear(validatedData);
      res.status(201).json(fiscalYear);
    } catch (error) {
      console.error('Create fiscal year error:', error);
      res.status(400).json({ error: 'Failed to create fiscal year' });
    }
  }

  async getFiscalPeriods(req: AuthRequest, res: Response) {
    try {
      const { fiscalYearId } = req.query;
      const periods = await managementService.getFiscalPeriods(fiscalYearId as string);
      res.json({ periods });
    } catch (error) {
      console.error('Get fiscal periods error:', error);
      res.status(500).json({ error: 'Failed to fetch fiscal periods' });
    }
  }

  async activateFiscalPeriod(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const period = await managementService.activateFiscalPeriod(id);
      res.json(period);
    } catch (error) {
      console.error('Activate fiscal period error:', error);
      res.status(400).json({ error: 'Failed to activate fiscal period' });
    }
  }

  async closeFiscalPeriod(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const period = await managementService.closeFiscalPeriod(id);
      res.json(period);
    } catch (error) {
      console.error('Close fiscal period error:', error);
      res.status(400).json({ error: 'Failed to close fiscal period' });
    }
  }

  // Approval Workflows
  async getApprovalWorkflows(req: AuthRequest, res: Response) {
    try {
      const workflows = await managementService.getApprovalWorkflows();
      res.json({ workflows });
    } catch (error) {
      console.error('Get approval workflows error:', error);
      res.status(500).json({ error: 'Failed to fetch approval workflows' });
    }
  }

  async createApprovalWorkflow(req: AuthRequest, res: Response) {
    try {
      const validatedData = createApprovalWorkflowSchema.parse(req.body);
      const workflow = await managementService.createApprovalWorkflow(validatedData);
      res.status(201).json(workflow);
    } catch (error) {
      console.error('Create approval workflow error:', error);
      res.status(400).json({ error: 'Failed to create approval workflow' });
    }
  }

  async getApprovalRequests(req: AuthRequest, res: Response) {
    try {
      const { userId, status } = req.query;
      const requests = await managementService.getApprovalRequests(
        userId as string, 
        status as string
      );
      res.json({ requests });
    } catch (error) {
      console.error('Get approval requests error:', error);
      res.status(500).json({ error: 'Failed to fetch approval requests' });
    }
  }

  async processApprovalAction(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { action, comments } = approvalActionSchema.parse(req.body);
      
      const result = await managementService.processApprovalAction(
        id, 
        action, 
        req.user!.id, 
        comments
      );
      
      res.json({ message: `Request ${action.toLowerCase()}d successfully`, result });
    } catch (error) {
      console.error('Process approval action error:', error);
      res.status(400).json({ error: 'Failed to process approval action' });
    }
  }

  // Enhanced Role Management
  async getRolesWithPermissions(req: AuthRequest, res: Response) {
    try {
      const roles = await managementService.getRolesWithPermissions();
      res.json({ roles });
    } catch (error) {
      console.error('Get roles with permissions error:', error);
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  }

  async createRole(req: AuthRequest, res: Response) {
    try {
      const validatedData = createRoleSchema.parse(req.body);
      const role = await managementService.createRole(validatedData);
      res.status(201).json(role);
    } catch (error) {
      console.error('Create role error:', error);
      res.status(400).json({ error: 'Failed to create role' });
    }
  }

  async updateRole(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateRoleSchema.parse(req.body);
      const role = await managementService.updateRole(id, validatedData);
      res.json(role);
    } catch (error) {
      console.error('Update role error:', error);
      res.status(400).json({ error: 'Failed to update role' });
    }
  }

  async deleteRole(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await managementService.deleteRole(id);
      res.json({ message: 'Role deleted successfully' });
    } catch (error) {
      console.error('Delete role error:', error);
      res.status(400).json({ error: 'Failed to delete role' });
    }
  }

  async getAllPermissions(req: AuthRequest, res: Response) {
    try {
      const permissions = await managementService.getAllPermissions();
      res.json({ permissions });
    } catch (error) {
      console.error('Get permissions error:', error);
      res.status(500).json({ error: 'Failed to fetch permissions' });
    }
  }

  // Enhanced User Management
  async getUsersWithDetails(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const result = await managementService.getUsersWithDetails(
        Number(page), 
        Number(limit), 
        search as string
      );
      res.json(result);
    } catch (error) {
      console.error('Get users with details error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  async updateUserRoles(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { roleIds } = req.body;
      
      const user = await managementService.updateUserRoles(id, roleIds);
      res.json(user);
    } catch (error) {
      console.error('Update user roles error:', error);
      res.status(400).json({ error: 'Failed to update user roles' });
    }
  }

  // Chart of Accounts Management
  async getChartOfAccounts(req: AuthRequest, res: Response) {
    try {
      const accounts = await managementService.getChartOfAccounts();
      res.json({ accounts });
    } catch (error) {
      console.error('Get chart of accounts error:', error);
      res.status(500).json({ error: 'Failed to fetch chart of accounts' });
    }
  }

  async createChartAccount(req: AuthRequest, res: Response) {
    try {
      const validatedData = createChartAccountSchema.parse(req.body);
      const account = await managementService.createChartAccount(validatedData);
      res.status(201).json(account);
    } catch (error) {
      console.error('Create chart account error:', error);
      res.status(400).json({ error: 'Failed to create chart account' });
    }
  }

  async updateChartAccount(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const account = await managementService.updateChartAccount(id, req.body);
      res.json(account);
    } catch (error) {
      console.error('Update chart account error:', error);
      res.status(400).json({ error: 'Failed to update chart account' });
    }
  }

  async deleteChartAccount(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await managementService.deleteChartAccount(id);
      res.json({ message: 'Chart account deleted successfully' });
    } catch (error) {
      console.error('Delete chart account error:', error);
      res.status(400).json({ error: 'Failed to delete chart account' });
    }
  }
}


// import { Request, Response } from 'express';
// import { PrismaClient } from '@prisma/client';
// import { 
//   updateCompanySettingsSchema,
//   createFiscalYearSchema,
//   updateSystemSettingSchema,
//   createApprovalWorkflowSchema,
//   approvalActionSchema,
//   createRoleSchema,
//   updateRoleSchema,
//   createChartAccountSchema
// } from '../types/management';
// import { AuthRequest } from '../middleware/auth';
// import { ManagementService } from '../services/management';

// const prisma = new PrismaClient();
// const managementService = new ManagementService();

// export class ManagementController {


//   // Cash Account Management
//   async getCashAccountsManagement(req: AuthRequest, res: Response) {
//     try {
//       const accounts = await prisma.cashAccount.findMany({
//         include: {
//           glAccount: {
//             select: { code: true, name: true }
//           }
//         },
//         orderBy: { code: 'asc' }
//       });
//       res.json({ accounts });
//     } catch (error) {
//       console.error('Get cash accounts management error:', error);
//       res.status(500).json({ error: 'Failed to fetch cash accounts' });
//     }
//   }

//   async createCashAccountManagement(req: AuthRequest, res: Response) {
//     try {
//       const validatedData = createCashAccountSchema.parse(req.body);
      
//       const account = await prisma.cashAccount.create({
//         data: {
//           code: validatedData.code,
//           name: validatedData.name,
//           accountType: validatedData.accountType,
//           accountNumber: validatedData.accountNumber,
//           bankName: validatedData.bankName,
//           glAccountId: validatedData.glAccountId,
//           balance: validatedData.balance || 0
//         },
//         include: {
//           glAccount: {
//             select: { code: true, name: true }
//           }
//         }
//       });

//       res.status(201).json(account);
//     } catch (error) {
//       console.error('Create cash account management error:', error);
//       res.status(400).json({ error: 'Failed to create cash account' });
//     }
//   }

//   async updateCashAccountManagement(req: AuthRequest, res: Response) {
//     try {
//       const { id } = req.params;
//       const validatedData = updateCashAccountSchema.parse(req.body);
      
//       const account = await prisma.cashAccount.update({
//         where: { id },
//         data: {
//           name: validatedData.name,
//           accountType: validatedData.accountType,
//           accountNumber: validatedData.accountNumber,
//           bankName: validatedData.bankName,
//           glAccountId: validatedData.glAccountId,
//           balance: validatedData.balance,
//           isActive: validatedData.isActive
//         },
//         include: {
//           glAccount: {
//             select: { code: true, name: true }
//           }
//         }
//       });

//       res.json(account);
//     } catch (error) {
//       console.error('Update cash account management error:', error);
//       res.status(400).json({ error: 'Failed to update cash account' });
//     }
//   }

//   async deleteCashAccountManagement(req: AuthRequest, res: Response) {
//     try {
//       const { id } = req.params;
      
//       // Check if account has transactions
//       const transactionCount = await prisma.cashTransaction.count({
//         where: { cashAccountId: id }
//       });

//       if (transactionCount > 0) {
//         return res.status(400).json({ 
//           error: 'Cannot delete cash account with existing transactions' 
//         });
//       }

//       // Check if account has non-zero balance
//       const account = await prisma.cashAccount.findUnique({
//         where: { id },
//         select: { balance: true }
//       });

//       if (account && Number(account.balance) !== 0) {
//         return res.status(400).json({ 
//           error: 'Cannot delete cash account with non-zero balance' 
//         });
//       }

//       await prisma.cashAccount.delete({
//         where: { id }
//       });

//       res.json({ message: 'Cash account deleted successfully' });
//     } catch (error) {
//       console.error('Delete cash account management error:', error);
//       res.status(400).json({ error: 'Failed to delete cash account' });
//     }
//   }
// }

