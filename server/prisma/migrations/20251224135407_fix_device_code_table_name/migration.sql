/*
  Warnings:

  - You are about to drop the `deviceCode` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "deviceCode";

-- CreateTable
CREATE TABLE "device_code" (
    "id" TEXT NOT NULL,
    "deviceCode" TEXT NOT NULL,
    "userCode" TEXT NOT NULL,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "lastPolledAt" TIMESTAMP(3),
    "pollingInterval" INTEGER,
    "clientId" TEXT,
    "scope" TEXT,

    CONSTRAINT "device_code_pkey" PRIMARY KEY ("id")
);
