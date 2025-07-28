-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('email', 'sms', 'push');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('booking', 'wallet', 'expense', 'rewards');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('sent', 'failed', 'retrying');

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "eventType" "EventType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "status" "Status" NOT NULL,
    "messageId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "payloadPreview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);
