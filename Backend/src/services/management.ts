import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class ManagementService {
  // Company Settings
  async getCompanySettings() {
    const settings = await prisma.systemSetting.findMany({
      where: { category: 'COMPANY' }
    });

    const company = settings.reduce((acc, setting) => {
      acc[setting.key.toLowerCase()] = setting.value;
      return acc;
    }, {} as any);

    return {
      id: 'default',
      name: company.company_name || 'Manufacturing Corp',
      baseCurrency: company.base_currency || 'NGN',
      timezone: company.timezone || 'Africa/Lagos',
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      
    };
  }

  async updateCompanySettings(data: any, userId: string) {
    const settingsToUpdate = [
      { key: 'COMPANY_NAME', value: data.name },
      { key: 'BASE_CURRENCY', value: data.baseCurrency },
      { key: 'TIMEZONE', value: data.timezone },
      { key: 'ADDRESS', value: data.address || '' },
      { key: 'PHONE', value: data.phone || '' },
      { key: 'EMAIL', value: data.email || '' },
    ];

    await prisma.$transaction(async (tx) => {
      for (const setting of settingsToUpdate) {
        await tx.systemSetting.upsert({
          where: {
            category_key: {
              category: 'COMPANY',
              key: setting.key
            }
          },
          update: {
            value: setting.value,
            updatedBy: userId,
            updatedAt: new Date()
          },
          create: {
            category: 'COMPANY',
            key: setting.key,
            value: setting.value,
            dataType: 'STRING',
            description: `Company ${setting.key.toLowerCase().replace('_', ' ')}`,
            updatedBy: userId
          }
        });
      }
    },
  {
  maxWait: 5000,  // 5s wait for connection
  timeout: 20000  // 20s max runtime
}
  );
  }

  // System Settings
  async getSystemSettings(category?: string) {
    const where: any = {};
    if (category) where.category = category;

    return await prisma.systemSetting.findMany({
      where,
      include: {
        updatedByUser: {
          select: { name: true, email: true }
        }
      },
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    });
  }

  async updateSystemSetting(data: any, userId: string) {
    return await prisma.systemSetting.upsert({
      where: {
        category_key: {
          category: data.category,
          key: data.key
        }
      },
      update: {
        value: data.value,
        dataType: data.dataType,
        description: data.description,
        updatedBy: userId,
        updatedAt: new Date()
      },
      create: {
        category: data.category,
        key: data.key,
        value: data.value,
        dataType: data.dataType,
        description: data.description,
        updatedBy: userId
      }
    });
  }

  async getCostingPolicy() {
    const setting = await prisma.systemSetting.findUnique({
      where: {
        category_key: {
          category: 'COSTING',
          key: 'GLOBAL_COSTING_METHOD'
        }
      }
    });

    return setting?.value || 'WEIGHTED_AVG';
  }

  async updateCostingPolicy(method: 'FIFO' | 'WEIGHTED_AVG', userId: string) {
    await prisma.systemSetting.upsert({
      where: {
        category_key: {
          category: 'COSTING',
          key: 'GLOBAL_COSTING_METHOD'
        }
      },
      update: {
        value: method,
        updatedBy: userId,
        updatedAt: new Date()
      },
      create: {
        category: 'COSTING',
        key: 'GLOBAL_COSTING_METHOD',
        value: method,
        dataType: 'STRING',
        description: 'Global inventory costing method',
        updatedBy: userId
      }
    });
  }

  // Fiscal Calendar
  async getFiscalYears() {
    return await prisma.fiscalYear.findMany({
      include: {
        _count: {
          select: { periods: true }
        }
      },
      orderBy: { year: 'desc' }
    });
  }

  async createFiscalYear(data: any) {
    return await prisma.$transaction(async (tx) => {
      // Deactivate other fiscal years
      await tx.fiscalYear.updateMany({
        data: { isActive: false }
      });

      // Create new fiscal year
      const fiscalYear = await tx.fiscalYear.create({
        data: {
          year: data.year,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          isActive: true
        }
      });

      // Create 12 monthly periods
      const startDate = new Date(data.startDate);
      const periods = [];

      for (let i = 0; i < 12; i++) {
        const periodStart = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const periodEnd = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0);
        
        periods.push({
          fiscalYearId: fiscalYear.id,
          periodNumber: i + 1,
          name: `${periodStart.toLocaleString('default', { month: 'long' })} ${periodStart.getFullYear()}`,
          startDate: periodStart,
          endDate: periodEnd,
          isActive: i === 0 // Only first period is active
        });
      }

      await tx.fiscalPeriod.createMany({
        data: periods
      });

      return fiscalYear;
    });
  }

  async getFiscalPeriods(fiscalYearId?: string) {
    const where: any = {};
    if (fiscalYearId) where.fiscalYearId = fiscalYearId;

    return await prisma.fiscalPeriod.findMany({
      where,
      include: {
        fiscalYear: {
          select: { year: true }
        }
      },
      orderBy: [{ fiscalYear: { year: 'desc' } }, { periodNumber: 'asc' }]
    });
  }

  async activateFiscalPeriod(periodId: string) {
    return await prisma.$transaction(async (tx) => {
      const period = await tx.fiscalPeriod.findUnique({
        where: { id: periodId },
        include: { fiscalYear: true }
      });

      if (!period) {
        throw new Error('Fiscal period not found');
      }

      // Deactivate all periods in the same fiscal year
      await tx.fiscalPeriod.updateMany({
        where: { fiscalYearId: period.fiscalYearId },
        data: { isActive: false }
      });

      // Activate selected period
      return await tx.fiscalPeriod.update({
        where: { id: periodId },
        data: { isActive: true }
      });
    });
  }

  async closeFiscalPeriod(periodId: string) {
    return await prisma.fiscalPeriod.update({
      where: { id: periodId },
      data: { 
        isClosed: true,
        isActive: false
      }
    });
  }

  // Approval Workflows
  async getApprovalWorkflows() {
    return await prisma.approvalWorkflow.findMany({
      include: {
        steps: {
          include: {
            role: {
              select: { name: true }
            }
          },
          orderBy: { stepOrder: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createApprovalWorkflow(data: any) {
    return await prisma.$transaction(async (tx) => {
      const workflow = await tx.approvalWorkflow.create({
        data: {
          name: data.name,
          entity: data.entity,
          minAmount: data.minAmount ? new Decimal(data.minAmount) : null,
          maxAmount: data.maxAmount ? new Decimal(data.maxAmount) : null
        }
      });

      // Create approval steps
      for (let i = 0; i < data.steps.length; i++) {
        const step = data.steps[i];
        await tx.approvalStep.create({
          data: {
            workflowId: workflow.id,
            stepOrder: i + 1,
            name: step.name,
            roleId: step.roleId,
            isRequired: step.isRequired
          }
        });
      }

      return workflow;
    });
  }

  async getApprovalRequests(userId?: string, status?: string) {
    const where: any = {};
    if (userId) where.requestedBy = userId;
    if (status) where.status = status;

    return await prisma.approvalRequest.findMany({
      where,
      include: {
        workflow: {
          select: { name: true, entity: true }
        },
        requestedByUser: {
          select: { name: true, email: true }
        },
        currentStep: {
          include: {
            role: {
              select: { name: true }
            }
          }
        },
        actions: {
          include: {
            user: {
              select: { name: true }
            },
            step: {
              select: { name: true }
            }
          },
          orderBy: { actionDate: 'desc' }
        }
      },
      orderBy: { requestedAt: 'desc' }
    });
  }

//   async createApprovalRequest(entityType: string, entityId: string, userId: string) {
//     // Find applicable workflow
//     const entity = await this.getEntityForApproval(entityType, entityId);
//     if (!entity) {
//       throw new Error('Entity not found');
//     }

//     if ("totalAmount" in entity) {
//   const workflow = await this.findApplicableWorkflow(entityType, Number(entity.totalAmount));
//   if (!workflow) {
//     // No approval required
//     return null;
//   }

//   const firstStep = workflow.steps[0]; // assuming you already fetched steps
// return await prisma.approvalRequest.create({
//   data: {
//     workflowId: workflow.id,
//     entityType,
//     entityId,
//     requestedByUser: { connect: { id: userId } },  // ✅ instead of requestedBy
//     currentStepId: firstStep.id,
//     status: "PENDING"
//   }
// });
// }

//   }

  async processApprovalAction(requestId: string, action: 'APPROVE' | 'REJECT', userId: string, comments?: string) {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({
        where: { id: requestId },
        include: {
          workflow: {
            include: {
              steps: {
                orderBy: { stepOrder: 'asc' }
              }
            }
          },
          currentStep: true
        }
      });

      if (!request || !request.currentStep) {
        throw new Error('Approval request not found');
      }

      // Record the action
      await tx.approvalAction.create({
        data: {
          requestId,
          stepId: request.currentStep.id,
          userId,
          action,
          comments
        }
      });

      if (action === 'REJECT') {
        // Reject the request
        await tx.approvalRequest.update({
          where: { id: requestId },
          data: {
            status: 'REJECTED',
            completedAt: new Date()
          }
        });

        // Update entity status
        await this.updateEntityApprovalStatus(tx, request.entityType, request.entityId, 'REJECTED');
      } else {
        // Find next step
        const currentStepOrder = request.currentStep.stepOrder;
        const nextStep = request.workflow.steps.find(s => s.stepOrder === currentStepOrder + 1);

        if (nextStep) {
          // Move to next step
          await tx.approvalRequest.update({
            where: { id: requestId },
            data: { currentStepId: nextStep.id }
          });
        } else {
          // Final approval
          await tx.approvalRequest.update({
            where: { id: requestId },
            data: {
              status: 'APPROVED',
              completedAt: new Date()
            }
          });

          // Update entity status
          await this.updateEntityApprovalStatus(tx, request.entityType, request.entityId, 'APPROVED');
        }
      }

      return request;
    });
  }

  private async getEntityForApproval(entityType: string, entityId: string) {
    switch (entityType) {
      case 'PURCHASE_ORDER':
        return await prisma.purchase.findUnique({ where: { id: entityId } });
      case 'SALES_ORDER':
        return await prisma.sale.findUnique({ where: { id: entityId } });
      case 'PRODUCTION_ORDER':
        return await prisma.productionOrder.findUnique({ where: { id: entityId } });
      default:
        return null;
    }
  }

  private async findApplicableWorkflow(entityType: string, amount?: number) {
    const workflows = await prisma.approvalWorkflow.findMany({
      where: {
        entity: entityType,
        isActive: true
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        }
      }
    });

    // Find workflow that matches amount criteria
    for (const workflow of workflows) {
      const minAmount = workflow.minAmount?.toNumber();
      const maxAmount = workflow.maxAmount?.toNumber();

      if (minAmount && amount && amount < minAmount) continue;
      if (maxAmount && amount && amount > maxAmount) continue;

      return workflow;
    }

    return null;
  }

  private async updateEntityApprovalStatus(tx: any, entityType: string, entityId: string, status: string) {
    const updateData = {
      approvalStatus: status,
      ...(status === 'APPROVED' && { approvedAt: new Date() })
    };

    switch (entityType) {
      case 'PURCHASE_ORDER':
        await tx.purchase.update({
          where: { id: entityId },
          data: updateData
        });
        break;
      case 'SALES_ORDER':
        await tx.sale.update({
          where: { id: entityId },
          data: updateData
        });
        break;
      case 'PRODUCTION_ORDER':
        await tx.productionOrder.update({
          where: { id: entityId },
          data: updateData
        });
        break;
    }
  }

  // Role Management
  async getRolesWithPermissions() {
    return await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: { id: true, name: true, resource: true, action: true, description: true }
            }
          }
        },
        _count: {
          select: { userRoles: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async createRole(data: any) {
    return await prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: data.name,
          description: data.description
        }
      });

      // Assign permissions if provided
      if (data.permissions && data.permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: data.permissions.map((permissionId: string) => ({
            roleId: role.id,
            permissionId
          }))
        });
      }

      return role;
    },
  {
  maxWait: 5000,  // 5s wait for connection
  timeout: 20000  // 20s max runtime
}
  );
  }

  async updateRole(roleId: string, data: any) {
    return await prisma.$transaction(async (tx) => {
      // Update role basic info
      const role = await tx.role.update({
        where: { id: roleId },
        data: {
          name: data.name,
          description: data.description
        }
      });

      // Update permissions if provided
      if (data.permissions !== undefined) {
        // Remove existing permissions
        await tx.rolePermission.deleteMany({
          where: { roleId }
        });

        // Add new permissions
        if (data.permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: data.permissions.map((permissionId: string) => ({
              roleId,
              permissionId
            }))
          });
        }
      }

      return role;
    },
  {
  maxWait: 5000,  // 5s wait for connection
  timeout: 20000  // 20s max runtime
}
  );
  }

  async deleteRole(roleId: string) {
    // Check if role is in use
    const userCount = await prisma.userRole.count({
      where: { roleId }
    });

    if (userCount > 0) {
      throw new Error('Cannot delete role that is assigned to users');
    }

    return await prisma.role.delete({
      where: { id: roleId }
    });
  }

  async getAllPermissions() {
    return await prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }]
    });
  }

  // User Management Enhancement
  async getUsersWithDetails(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          userRoles: {
            include: {
              role: {
                select: { id: true, name: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    const usersWithRoles = users.map(user => ({
      ...user,
      roles: user.userRoles.map(ur => ur.role),
      userRoles: undefined
    }));

    return {
      users: usersWithRoles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async updateUserRoles(userId: string, roleIds: string[]) {
    return await prisma.$transaction(async (tx) => {
      // Remove existing roles
      await tx.userRole.deleteMany({
        where: { userId }
      });

      // Add new roles
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map(roleId => ({
            userId,
            roleId
          }))
        });
      }

      return await tx.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            include: {
              role: {
                select: { name: true }
              }
            }
          }
        }
      });
    },
  {
  maxWait: 5000,  // 5s wait for connection
  timeout: 20000  // 20s max runtime
}
  );
  }

  // Chart of Accounts Management
  async getChartOfAccounts() {
    return await prisma.chartOfAccount.findMany({
      include: {
        parent: {
          select: { code: true, name: true }
        },
        children: {
          select: { id: true, code: true, name: true }
        },
        _count: {
          select: { journalLines: true }
        }
      },
      orderBy: { code: 'asc' }
    });
  }

  async createChartAccount(data: any) {
    return await prisma.$transaction(async (tx) => {
      // Use provided code or generate one
      let accountCode = data.code;
      if (!accountCode) {
        accountCode = await this.generateAccountCode(data.accountType, tx);
      } else {
        // Verify code is not already in use
        const existing = await tx.chartOfAccount.findUnique({
          where: { code: accountCode }
        });
        if (existing) {
          throw new Error(`Account code ${accountCode} is already in use`);
        }
      }
      
      return await tx.chartOfAccount.create({
        data: {
          code: accountCode,
          name: data.name,
          accountType: data.accountType,
          description: data.description,
          parentId: data.parentId || null
        }
      });
    },
  );
  }

  async updateChartAccount(accountId: string, data: any) {
    return await prisma.chartOfAccount.update({
      where: { id: accountId },
      data: {
        name: data.name,
        accountType: data.accountType,
        description: data.description,
        parentId: data.parentId || null,
        isActive: data.isActive
      }
    });
  }

  async deleteChartAccount(accountId: string) {
    // Check if account has journal entries
    const journalCount = await prisma.journalLine.count({
      where: { accountId }
    });

    if (journalCount > 0) {
      throw new Error('Cannot delete account with existing journal entries');
    }

    // Check if account has children
    const childrenCount = await prisma.chartOfAccount.count({
      where: { parentId: accountId }
    });

    if (childrenCount > 0) {
      throw new Error('Cannot delete account with child accounts');
    }

    return await prisma.chartOfAccount.delete({
      where: { id: accountId }
    });
  }

  private async generateAccountCode(accountType: string, tx: any): Promise<string> {
    // Define account code ranges by type
    const codeRanges = {
      'CURRENT_ASSETS': { start: 1000, end: 1199 },
      'TRADE_RECEIVABLES': { start: 1200, end: 1299 },
      'NON_CURRENT_ASSETS': { start: 1500, end: 1599 },
      'CURRENT_LIABILITY': { start: 2000, end: 2499 },
      'TRADE_PAYABLES': { start: 2100, end: 2199 },
      'NON_CURRENT_LIABILITY': { start: 2500, end: 2999 },
      'EQUITY': { start: 3000, end: 3999 },
      'INCOME': { start: 4000, end: 4499 },
      'OTHER_INCOME': { start: 4500, end: 4999 },
      'COST_OF_SALES': { start: 5000, end: 5999 },
      'EXPENSES': { start: 6000, end: 6299 }
    };

    const range = codeRanges[accountType as keyof typeof codeRanges];
    if (!range) {
      throw new Error(`Invalid account type: ${accountType}`);
    }

    // Find the next available code in the range
    const existingCodes = await tx.chartOfAccount.findMany({
      where: {
        code: {
          gte: range.start.toString(),
          lte: range.end.toString()
        }
      },
      select: { code: true },
      orderBy: { code: 'asc' }
    });

    const usedCodes = new Set(existingCodes.map((acc: any) => parseInt(acc.code)));
    
    // Find first available code in range
    for (let code = range.start; code <= range.end; code += 10) {
      if (!usedCodes.has(code)) {
        return code.toString();
      }
    }

    throw new Error(`No available account codes in range for ${accountType}`);
  }
}