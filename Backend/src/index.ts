import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";

import authRoutes from "./routes/auth";
import salesRoutes from "./routes/sales";
import purchaseRoutes from "./routes/purchase";
import inventoryRoutes from "./routes/inventory";
import productionRoutes from "./routes/production";
import cashRoutes from "./routes/cash";
import reportsRoutes from "./routes/reports";
import managementRoutes from "./routes/management";
import assetsRoutes from "./routes/assets";
import posRoutes from "./routes/pos";
import memos from "./routes/memo";
import journal from "./routes/journal";
import adjustment from "./routes/stockAdjustment";
import dashboardRoutes from "./routes/dashboard";
import openingStockRoutes from "./routes/openingStock";
import itemImportRoutes from "./routes/itemImport";

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT) || 3001;

const publicPath = path.resolve(process.cwd(), "public");
const uploadsPath = path.resolve(process.cwd(), "uploads");

// Test database connection
async function testConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Health checks
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/sales", salesRoutes);
app.use("/api/v1/purchase", purchaseRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/production", productionRoutes);
app.use("/api/v1/cash", cashRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/management", managementRoutes);
app.use("/api/v1/assets", assetsRoutes);
app.use("/api/v1/pos", posRoutes);
app.use("/api/v1/memos", memos);
app.use("/api/v1/journal", journal);
app.use("/api/v1/adjustment", adjustment);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/opening-stock", openingStockRoutes);
app.use("/api/v1/items-import", itemImportRoutes);

// Uploads
app.use("/uploads", express.static(uploadsPath));

/*
|--------------------------------------------------------------------------
| React Frontend
|--------------------------------------------------------------------------
|
| The contents of your React/Vite build should be copied to /public
|
*/
app.use(express.static(publicPath));

// React Router support
app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", async () => {
  await testConnection();

  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`📁 Public folder: ${publicPath}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import { PrismaClient } from "@prisma/client";
// import authRoutes from "./routes/auth";
// import salesRoutes from "./routes/sales";
// import purchaseRoutes from "./routes/purchase";
// import inventoryRoutes from "./routes/inventory";
// import productionRoutes from "./routes/production";
// import cashRoutes from "./routes/cash";
// import reportsRoutes from "./routes/reports";
// import managementRoutes from "./routes/management";
// import assetsRoutes from "./routes/assets";
// import posRoutes from "./routes/pos";
// // import memosRoutes from './routes/memos';
// // import memoRoutes from "./routes/memoRoutes";
// import memos from "./routes/memo";
// import journal from "./routes/journal";
// import adjustment from "./routes/stockAdjustment";
// import dashboardRoutes from "./routes/dashboard";

// dotenv.config();

// const prisma = new PrismaClient();
// const app = express();
// const PORT = process.env.PORT || 3001;

// // Test database connection
// async function testConnection() {
//   try {
//     await prisma.$connect();
//     console.log("✅ Database connected successfully");
//   } catch (error) {
//     console.error("❌ Database connection failed:", error);
//     process.exit(1);
//   }
// }

// app.get("/api/health", (req, res) => {
//   res.json({ status: "ok", timestamp: new Date().toISOString() });
// });

// app.use((req, res, next) => {
//   // console.log("Incoming:", req.method, req.path);
//   next();
// });

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Routes
// app.use("/api/v1/auth", authRoutes);
// app.use("/api/v1/sales", salesRoutes);
// app.use("/api/v1/purchase", purchaseRoutes);
// app.use("/api/v1/inventory", inventoryRoutes);
// app.use("/api/v1/production", productionRoutes);
// app.use("/api/v1/cash", cashRoutes);
// app.use("/api/v1/reports", reportsRoutes);
// app.use("/api/v1/management", managementRoutes);
// app.use("/api/v1/assets", assetsRoutes);
// app.use("/api/v1/pos", posRoutes);
// app.use("/api/v1/memos", memos);
// app.use("/api/v1/journal", journal);
// app.use("/api/v1/adjustment", adjustment);
// app.use("/api/v1/dashboard", dashboardRoutes);

// app.use("/uploads", express.static("uploads"));

// // app.use("/api", memoRoutes);

// // app.use("/api/memos", memoRoutes);

// // Health check
// app.get("/health", (req, res) => {
//   res.json({ status: "OK", timestamp: new Date().toISOString() });
// });

// app.listen(PORT, async () => {
//   await testConnection();
//   console.log(`Server running on port ${PORT}`);
// });

// // Graceful shutdown
// process.on("SIGINT", async () => {
//   await prisma.$disconnect();
//   process.exit(0);
// });

// process.on("SIGTERM", async () => {
//   await prisma.$disconnect();
//   process.exit(0);
// });
