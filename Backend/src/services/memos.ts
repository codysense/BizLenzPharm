// import { PrismaClient } from '@prisma/client';
// import { GeneralLedgerService } from './gl';

// const prisma = new PrismaClient();
// const glService = new GeneralLedgerService();

// type MemoInput = {
//   module: 'SALES' | 'PURCHASES',
//   memoType: 'CREDIT' | 'DEBIT',
//   amount: number,
//   // accountId: string, // the chosen chart account id
//   customerId?: string,
//   vendorId?: string,
//   description?: string,
//   userId?: string
// };

// export class MemoService {
//   async createMemo(input: MemoInput) {
    
//     // now: choose depending on module
//     const baseAccountCode = input.module === 'SALES' ? '1200' : '2000'; // 1200 = AR, 2000 = AP
//     const baseAccount = await prisma.chartOfAccount.findFirst({ where: { code: baseAccountCode } });
//     if (!baseAccount) {
//             throw new Error(`${input.module === 'SALES' ? 'Accounts Receivable (1200)' : 'Trade Payable (2000)'} not found in ChartOfAccount`);
//     }

//     // const baseAccount = await prisma.chartOfAccount.findFirst({ where: { code: '1200' } });
//     // if (!baseAccount) {
//     //   throw new Error('Accounts Receivable account (code 1200) not found. Please ensure it exists in ChartOfAccount.');
//     // }

//     const amount = Number(input.amount);
//     let entries: { accountCode: string; debit: number; credit: number; refType?: string; refId?: string }[] = [];

//     // Build the 2-line journal based on memo type
//     // Credit memo: credit AR, debit chosen account
//     // Debit memo: debit AR, credit chosen account
//     const chosenAccount = await prisma.chartOfAccount.findUnique({ where: { id: input.accountId } });
//     if (!chosenAccount) throw new Error('Selected chart account not found');

//     if (input.memoType === 'CREDIT') {
//       entries = [
//         { accountCode: baseAccount.code, debit: 0, credit: amount, refType: input.module.toLowerCase(), refId: input.module === 'SALES' ? input.customerId : input.vendorId },
//         { accountCode: chosenAccount.code, debit: amount, credit: 0, refType: input.module.toLowerCase(), refId: input.module === 'SALES' ? input.customerId : input.vendorId }
//       ];
//     } else {
//       entries = [
//         { accountCode: baseAccount.code, debit: amount, credit: 0, refType: input.module.toLowerCase(), refId: input.module === 'SALES' ? input.customerId : input.vendorId },
//         { accountCode: chosenAccount.code, debit: 0, credit: amount, refType: input.module.toLowerCase(), refId: input.module === 'SALES' ? input.customerId : input.vendorId }
//       ];
//     }

//     return await prisma.$transaction(async (tx) => {
//       // Post the journal (this uses your existing GL service that creates Journal and JournalLine rows)
//       const memoText = `${input.memoType} memo for ${input.module} ${input.module === 'SALES' ? input.customerId : input.vendorId}`;
//       const journalId = await glService.postJournal(entries, memoText, input.userId || 'system', new Date());

//       // Save memo metadata
//       const memo = await tx.memo.create({
//         data: {
//           module: input.module,
//           memoType: input.memoType,
//           amount: amount,
//           description: input.description,
//           accountId: input.accountId,
//           customerId: input.customerId,
//           vendorId: input.vendorId,
//           createdBy: input.userId || 'system'
//         }
//       });

//       return { memo, journalId };
//     });
//   }

//   async getMemos(module?: string) {
//     return await prisma.memo.findMany({
//       where: module ? { module } : {},
//       include: { account: true, customer: true, vendor: true },
//       orderBy: { createdAt: 'desc' }
//     });
//   }
// }

// export default new MemoService();
