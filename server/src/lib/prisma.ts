import dotenv from "dotenv";
import path from "path";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import net from "net";

const envPath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: envPath });

if (net.setDefaultAutoSelectFamilyAttemptTimeout) {
  net.setDefaultAutoSelectFamilyAttemptTimeout(10000);
}

// CRITICAL for local Node.js environments (like Express on Fedora)
if (typeof window === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const connectionString = `${process.env.DATABASE_URL}`;

// Use the specialized Neon adapter instead of PrismaPg
const adapter = new PrismaNeon({ connectionString });

// Use your custom generated client
export const prisma = new PrismaClient({ adapter });
