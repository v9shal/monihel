-- DropIndex
DROP INDEX "Endpoint_url_key";

-- AlterTable
ALTER TABLE "Endpoint" ADD COLUMN     "alertOnConsecutiveFails" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "consecutiveFails" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "userId" DROP NOT NULL;
