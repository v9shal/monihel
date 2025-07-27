-- migration.sql (Corrected and Reordered)

-- Step 1: Create all necessary ENUM types first.
CREATE TYPE "PingStatus" AS ENUM ('UP', 'DOWN', 'TIMEOUT');
CREATE TYPE "AlertStatus" AS ENUM ('TRIGGERED', 'ACKNOWLEDGED', 'RESOLVED');
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'WEBHOOK');

-- Step 2: Create the User table AND its unique index immediately.
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Step 3: Now that the unique index exists, safely insert the default user.
INSERT INTO "User" (email, name, password, "createdAt", "updatedAt") 
VALUES ('default-user@example.com', 'Default User', 'temporary-password-hash', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Step 4: Alter the Endpoint table, adding all new columns as OPTIONAL for now.
ALTER TABLE "Endpoint"
    ADD COLUMN "name" TEXT,
    ADD COLUMN "updatedAt" TIMESTAMP(3),
    ADD COLUMN "checkIntervalSec" INTEGER NOT NULL DEFAULT 60,
    ADD COLUMN "isMuted" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "userId" INTEGER,
    ALTER COLUMN "url" SET DATA TYPE VARCHAR(2048);

-- Step 5: Populate the new required columns for existing rows.
UPDATE "Endpoint" SET 
    "name" = "url", -- Use the URL as a default name
    "updatedAt" = NOW(), -- Use the current time as the updated time
    "userId" = (SELECT id FROM "User" WHERE email = 'default-user@example.com')
WHERE "name" IS NULL; -- Only update rows that haven't been touched yet

-- Step 6: Now that all rows are populated, enforce the NOT NULL constraints.
ALTER TABLE "Endpoint"
    ALTER COLUMN "name" SET NOT NULL,
    ALTER COLUMN "updatedAt" SET NOT NULL,
    ALTER COLUMN "userId" SET NOT NULL;

-- Step 7: Handle the complex type change for EndpointMetric.status
-- We add a new temporary column, copy the data, drop the old column, and rename the new one.
ALTER TABLE "EndpointMetric" ADD COLUMN "status_new" "PingStatus";
UPDATE "EndpointMetric" SET "status_new" = "status"::"PingStatus";
ALTER TABLE "EndpointMetric" DROP COLUMN "status";
ALTER TABLE "EndpointMetric" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "EndpointMetric" ALTER COLUMN "status" SET NOT NULL;

-- Step 8: Now handle all other table creations and constraints.
ALTER TABLE "EndpointMetric" DROP CONSTRAINT "EndpointMetric_pkey",
ADD CONSTRAINT "EndpointMetric_pkey" PRIMARY KEY ("timestamp", "endpointId");

CREATE TABLE "Alert" (
    "id" SERIAL NOT NULL,
    "status" "AlertStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "message" TEXT,
    "endpointId" INTEGER NOT NULL,
    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationChannel" (
    "id" SERIAL NOT NULL,
    "type" "NotificationType" NOT NULL,
    "target" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "NotificationChannel_pkey" PRIMARY KEY ("id")
);

-- Step 9: Create all remaining indexes and foreign keys.
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "Alert_endpointId_status_idx" ON "Alert"("endpointId", "status");
CREATE INDEX "Endpoint_userId_idx" ON "Endpoint"("userId");
CREATE UNIQUE INDEX "Endpoint_userId_url_key" ON "Endpoint"("userId", "url");
CREATE INDEX "EndpointMetric_endpointId_idx" ON "EndpointMetric"("endpointId");
ALTER TABLE "Endpoint" DROP CONSTRAINT IF EXISTS "Endpoint_userId_fkey";
ALTER TABLE "Endpoint" ADD CONSTRAINT "Endpoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop and Add EndpointMetric -> Endpoint Foreign Key
ALTER TABLE "EndpointMetric" DROP CONSTRAINT IF EXISTS "EndpointMetric_endpointId_fkey";
ALTER TABLE "EndpointMetric" ADD CONSTRAINT "EndpointMetric_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "Endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop and Add Alert -> Endpoint Foreign Key
ALTER TABLE "Alert" DROP CONSTRAINT IF EXISTS "Alert_endpointId_fkey";
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "Endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop and Add NotificationChannel -> User Foreign Key
ALTER TABLE "NotificationChannel" DROP CONSTRAINT IF EXISTS "NotificationChannel_userId_fkey";
ALTER TABLE "NotificationChannel" ADD CONSTRAINT "NotificationChannel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;