import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { AuthUser, JwtPayload } from "../types/auth";

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// export const authenticate = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader?.startsWith("Bearer ")) {
//       return res.status(401).json({ error: "No token provided" });
//     }

//     const token = authHeader.substring(7);
//     const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

//     // Fetch user with roles and permissions
//     const user = await prisma.user.findUnique({
//       where: { id: payload.userId },
//       include: {
//         userRoles: {
//           include: {
//             role: {
//               include: {
//                 rolePermissions: {
//                   include: {
//                     permission: true,
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     });

//     if (!user || user.status !== "ACTIVE") {
//       return res.status(401).json({ error: "User not found or inactive" });
//     }

//     // Extract roles and permissions
//     const roles = user.userRoles.map((ur) => ur.role.name);
//     const permissions = user.userRoles.flatMap((ur) =>
//       ur.role.rolePermissions.map((rp) => rp.permission.name),
//     );

//     req.user = {
//       id: user.id,
//       email: user.email,
//       name: user.name,
//       roles,
//       permissions,
//     };
//     // console.log("AUTH middleware user:", user?.id);
//     // console.log("Token payload:", payload);

//     next();
//   } catch (error: any) {
//     // console.log("JWT ERROR:", error.message);
//     return res.status(401).json({ error: "Invalid token" });
//   }
// };

// export const requireRole = (requiredRole: []) => {
//   return (req: AuthRequest, res: Response, next: NextFunction) => {
//     if (!req.user) {
//       return res.status(401).json({ error: 'Not authenticated' });
//     }

//     if (!req.user.roles.includes(requiredRole.values()) && !req.user.roles.includes('General Manager')) {
//       return res.status(403).json({ error: `Role ${requiredRole} required` });
//     }

//     next();
//   };
// };

// import { Response, NextFunction } from "express";
// import { AuthRequest } from "../types"; // adjust import path

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    //console.log("Authorization Header:", authHeader); // Debugging line

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // 1. Verify that this specific session is still active in the database
    // This instantly logs out the old device if its session row was deleted
    const session = await prisma.userSession.findFirst({
      where: {
        userId: payload.userId,
        refreshToken: payload.sessionToken, // Map to the specific session
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return res
        .status(401)
        .json({ error: "Session expired or logged out from this device." });
    }

    // 2. Fetch user with roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    // Extract roles and permissions
    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = user.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map((rp) => rp.permission.name),
    );

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
      permissions,
    };

    next();
  } catch (error: any) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const requireRole = (requiredRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userRoles = req.user.roles || [];

    // Check if user has at least one required role OR is General Manager
    const hasRole =
      requiredRoles.some((role) => userRoles.includes(role)) ||
      userRoles.includes("General Manager");

    if (!hasRole) {
      return res.status(403);
      // .json({ error: `Requires one of: ${requiredRoles.join(", ")}` });
    }

    next();
  };
};

export const authorize = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if user has the required permission or is a CFO/General Manager with full access
    // const hasPermission = req.user.permissions.includes(requiredPermission);
    // const hasFullAccess = req.user.roles.includes('Auditor') || req.user.roles.includes('General Manager');

    // if (!hasPermission && !hasFullAccess) {
    //   return res.status(403).json({ error: 'Insufficient permissions' });
    // }

    next();
  };
};
