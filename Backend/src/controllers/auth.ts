import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { loginSchema, registerSchema } from "../types/auth";
import { AuthRequest } from "../middleware/auth";
import { date } from "zod";
import crypto from "crypto";

const prisma = new PrismaClient();

// Utility: generate JWT token safely

function generateToken(
  payload: Record<string, any>,
  secret: Secret,
  expiresIn: string | number,
): string {
  const options: SignOptions = { expiresIn: expiresIn as any };
  return jwt.sign(payload, secret, options);
}

export class AuthController {
  // async login(req: Request, res: Response) {
  //   try {
  //     const { email, password } = loginSchema.parse(req.body);

  //     //Check if number of concurrent users reached
  //     const activeSessions = await prisma.userSession.count({
  //       where: {
  //         expiresAt: {
  //           gt: new Date(),
  //         },
  //       },
  //     });

  //     if (activeSessions >= 3) {
  //       throw new Error("Maximum concurrent users reached");
  //     }

  //     const user = await prisma.user.findUnique({
  //       where: { email },
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
  //       return res.status(401).json({ error: "Non-Active User" });
  //     }

  //     const isValidPassword = await bcrypt.compare(password, user.password);
  //     if (!isValidPassword) {
  //       return res.status(401).json({ error: "Invalid credentials" });
  //     }

  //     // Update last login
  //     await prisma.$transaction(async (tx) => {
  //       await tx.user.update({
  //         where: { id: user.id },
  //         data: { lastLoginAt: new Date() },
  //       });

  //       // const refreshToken = jwt.sign(
  //       //   { userId: user.id },
  //       //   process.env.REFRESH_SECRET!,
  //       //   { expiresIn: "7d" },
  //       // );

  //       const refreshToken = generateToken(
  //         { userId: user.id },
  //         process.env.JWT_REFRESH_SECRET as string,
  //         process.env.JWT_REFRESH_EXPIRY as string,
  //       );

  //       const hashedRefreshToken = crypto
  //         .createHash("sha256")
  //         .update(refreshToken)
  //         .digest("hex");

  //       await tx.refreshToken.create({
  //         data: {
  //           token: hashedRefreshToken,
  //           userId: user.id,
  //           expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  //         },
  //       });
  //       const accessToken = generateToken(
  //         { userId: user.id, email: user.email },
  //         process.env.JWT_SECRET as string,
  //         process.env.JWT_ACCESS_EXPIRY as string,
  //       );

  //       // Extract user roles & permissions
  //       const roles = user.userRoles.map((ur) => ur.role.name);
  //       const permissions = user.userRoles.flatMap((ur) =>
  //         ur.role.rolePermissions.map((rp) => rp.permission.name),
  //       );

  //       res.json({
  //         user: {
  //           id: user.id,
  //           email: user.email,
  //           name: user.name,
  //           roles,
  //           permissions,
  //         },
  //         accessToken,
  //         refreshToken,
  //       });
  //     });

  //     // Generate tokens
  //   } catch (error) {
  //     console.error("Login error:", error);
  //     res.status(400).json({ error: "Invalid request data" });
  //   }
  // }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Clean expired sessions first
      await prisma.userSession.deleteMany({
        where: {
          expiresAt: {
            lte: new Date(),
          },
        },
      });

      const user = await prisma.user.findUnique({
        where: { email },
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
        return res.status(401).json({
          error: "Non-Active User",
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          error: "Invalid credentials",
        });
      }

      // Optional: allow same user to login again without consuming extra slot
      const existingSession = await prisma.userSession.findFirst({
        where: {
          userId: user.id,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!existingSession) {
        const activeSessions = await prisma.userSession.count({
          where: {
            expiresAt: {
              gt: new Date(),
            },
          },
        });

        if (activeSessions >= 3) {
          return res.status(403).json({
            error:
              "Maximum concurrent users reached. Logout another user first.",
          });
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            lastLoginAt: new Date(),
          },
        });

        const refreshToken = generateToken(
          { userId: user.id },
          process.env.JWT_REFRESH_SECRET as string,
          process.env.JWT_REFRESH_EXPIRY as string,
        );

        const hashedRefreshToken = crypto
          .createHash("sha256")
          .update(refreshToken)
          .digest("hex");

        const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await tx.refreshToken.create({
          data: {
            token: hashedRefreshToken,
            userId: user.id,
            expiresAt: expiryDate,
          },
        });

        // Create session
        await tx.userSession.create({
          data: {
            userId: user.id,
            refreshToken: hashedRefreshToken,
            expiresAt: expiryDate,
          },
        });

        const accessToken = generateToken(
          {
            userId: user.id,
            email: user.email,
          },
          process.env.JWT_SECRET as string,
          process.env.JWT_ACCESS_EXPIRY as string,
        );

        const roles = user.userRoles.map((ur) => ur.role.name);

        const permissions = user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.name),
        );

        res.json({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            roles,
            permissions,
          },
          accessToken,
          refreshToken,
        });
      });
    } catch (error) {
      console.error("Login error:", error);

      return res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid request data",
      });
    }
  }

  async register(req: Request, res: Response) {
    try {
      const { name, email, password, roleId } = registerSchema.parse(req.body);

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.$transaction(
        async (tx) => {
          const newUser = await tx.user.create({
            data: { name, email, password: hashedPassword },
          });

          await tx.userRole.create({
            data: { userId: newUser.id, roleId },
          });

          return newUser;
        },
        {
          maxWait: 5000, // 5s wait for connection
          timeout: 20000, // 20s max runtime
        },
      );

      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(400).json({ error: "Invalid request data" });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: "Refresh token required" });
      }

      // 1️ Verify JWT signature
      const payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET as string,
      ) as { userId: string };

      // 2️ Hash incoming token
      const hashedToken = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      // 3️ Check if token exists in DB
      const existingToken = await prisma.refreshToken.findUnique({
        where: { token: hashedToken },
      });

      if (!existingToken) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      // 4️ Check user still valid
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, status: true },
      });

      if (!user || user.status !== "ACTIVE") {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      // 5️ Delete old refresh token (rotation)
      await prisma.refreshToken.delete({
        where: { id: existingToken.id },
      });

      // 6️ Generate new tokens
      const newAccessToken = generateToken(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET as string,
        process.env.JWT_ACCESS_EXPIRY as string,
      );

      const newRefreshToken = generateToken(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET as string,
        process.env.JWT_REFRESH_EXPIRY as string,
      );

      // 7️ Hash new refresh token before storing
      const newHashedToken = crypto
        .createHash("sha256")
        .update(newRefreshToken)
        .digest("hex");

      await prisma.refreshToken.create({
        data: {
          token: newHashedToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // 8️ Return new tokens
      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      console.error("Refresh error:", error);
      res.status(401).json({ error: "Invalid refresh token" });
    }
  }

  async me(req: AuthRequest, res: Response) {
    res.json(req.user);
  }

  // async logout(req: AuthRequest, res: Response) {
  //   const refreshToken = req.body.refreshToken;

  //   if (!refreshToken) {
  //     return res.status(400).json({ message: "Refresh token required" });
  //   }

  //   const hashedToken = crypto
  //     .createHash("sha256")
  //     .update(refreshToken)
  //     .digest("hex");

  //   await prisma.refreshToken.deleteMany({
  //     where: { token: hashedToken },
  //   });

  //   // await prisma.refreshToken.deleteMany({
  //   //   where: { token: refreshToken },
  //   // });

  //   res.json({ message: "Logged out successfully" });
  // }

  async logout(req: AuthRequest, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          message: "Refresh token required",
        });
      }

      const hashedToken = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      await prisma.$transaction(async (tx) => {
        await tx.refreshToken.deleteMany({
          where: {
            token: hashedToken,
          },
        });

        await tx.userSession.deleteMany({
          where: {
            refreshToken: hashedToken,
          },
        });
      });

      return res.json({
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Logout failed",
      });
    }
  }

  async getUsers(req: AuthRequest, res: Response) {
    try {
      // if (
      //   !req.user?.roles.includes("Senior Accountant") &&
      //   !req.user?.roles.includes("General Manager") &&
      //   !req.user?.roles.includes("Production Manager")
      // ) {
      //   return res.status(403).json({ error: "Insufficient permissions" });
      // }

      const { page = 1, limit = 10, search } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: "insensitive" } },
          { email: { contains: search as string, mode: "insensitive" } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: Number(limit),
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
            userRoles: {
              include: {
                role: { select: { name: true } },
              },
            },
            warehouse: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.count({ where }),
      ]);

      const usersWithRoles = users.map((user) => ({
        ...user,
        roles: user.userRoles.map((ur) => ur.role.name),
        warehouse: user.warehouse || null,
        userRoles: undefined,
      }));

      res.json({
        users: usersWithRoles,
        // warehouse: users?.warehouse || null,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  async createUser(req: AuthRequest, res: Response) {
    try {
      if (
        !req.user?.roles.includes("Senior Accountant") &&
        !req.user?.roles.includes("General Manager")
      ) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const { name, email, password, roleId, warehouseId } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const activeUsersCount = await prisma.user.count({
        where: {
          status: "ACTIVE",
        },
      });

      if (activeUsersCount >= 3) {
        return res.status(400).json({
          error: "Maximum of 3 active users allowed",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.$transaction(
        async (tx) => {
          const newUser = await tx.user.create({
            data: {
              name,
              email,
              password: hashedPassword,
              warehouseId: warehouseId || null,
            },
          });

          await tx.userRole.create({
            data: { userId: newUser.id, roleId },
          });

          return newUser;
        },
        {
          maxWait: 5000, // 5s wait for connection
          timeout: 20000, // 20s max runtime
        },
      );

      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(400).json({ error: "Failed to create user" });
    }
  }

  async updateUser(req: AuthRequest, res: Response) {
    try {
      if (
        !req.user?.roles.includes("Senior Accountant") &&
        !req.user?.roles.includes("General Manager")
      ) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const { id } = req.params;
      const { name, email, password, roleId, warehouseId } = req.body;

      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Prevent duplicate email (except self)
      if (email && email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email },
        });
        if (emailExists) {
          return res.status(400).json({ error: "Email already in use" });
        }
      }

      const hashedPassword = password
        ? await bcrypt.hash(password, 12)
        : undefined;

      const updatedUser = await prisma.$transaction(
        async (tx) => {
          // Update user core fields
          const user = await tx.user.update({
            where: { id },
            data: {
              name,
              email,
              ...(hashedPassword && { password: hashedPassword }),
              warehouseId: warehouseId ?? null,
            },
          });

          // Update role (replace existing role)
          if (roleId) {
            await tx.userRole.deleteMany({
              where: { userId: id },
            });

            await tx.userRole.create({
              data: {
                userId: id,
                roleId,
              },
            });
          }

          return user;
        },
        {
          maxWait: 5000,
          timeout: 20000,
        },
      );

      res.json({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        status: updatedUser.status,
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(400).json({ error: "Failed to update user" });
    }
  }

  async updateUserStatus(req: AuthRequest, res: Response) {
    try {
      if (
        !req.user?.roles.includes("Senior Accountant") &&
        !req.user?.roles.includes("General Manager")
      ) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const { id } = req.params;
      const { status } = req.body;

      if (id === req.user.id) {
        return res.status(400).json({ error: "Cannot change your own status" });
      }

      const user = await prisma.user.update({
        where: { id },
        data: { status },
        select: { id: true, name: true, email: true, status: true },
      });

      res.json(user);
    } catch (error) {
      console.error("Update user status error:", error);
      res.status(400).json({ error: "Failed to update user status" });
    }
  }

  async getRoles(req: AuthRequest, res: Response) {
    try {
      if (
        !req.user?.roles.includes("Senior Accountant") &&
        !req.user?.roles.includes("General Manager")
      ) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      const roles = await prisma.role.findMany({
        select: { id: true, name: true, description: true },
        orderBy: { name: "asc" },
      });

      res.json({ roles });
    } catch (error) {
      console.error("Get roles error:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  }
}
