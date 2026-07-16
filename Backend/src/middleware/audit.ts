import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth';

const prisma = new PrismaClient();

export  const auditLogger = (action: string, entity: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    let responseData: any;

    res.json = function (data: any) {
      responseData = data;
      return originalJson.call(this, data);
    };

    const originalEnd = res.end;
    res.end = function (chunk: any, ...args: any[]): Response {
      if (req.user && res.statusCode < 400) {
        // run asynchronously, don't block response
        (async () => {
          try {
            let beforeJson: any = null;
            let afterJson: any = null;

            if (action === 'CREATE') {
              afterJson = responseData || null;
            } else if (action === 'UPDATE') {
              beforeJson = req.body || null;   // what was sent for update
              afterJson = responseData || null; // updated record
            } else if (action === 'DELETE') {
              beforeJson = responseData || null; // deleted record (usually returned before delete)
            }

            await prisma.auditLog.create({
              data: {
                userId: req.user.id,
                action,
                entity,
                entityId: responseData?.id || req.params.id || 'unknown',
                beforeJson,
                afterJson,
                ipAddress: req.ip,
              },
            });
          } catch (error) {
            console.error('Audit logging failed:', error);
          }
        })();
      }

      return originalEnd.call(this, chunk, ...args);
    } as any;
    // console.log("AuditLogger sees req.user:", req.user);

    next();
  };
};
