-- AlterTable
ALTER TABLE "BookingToken" ADD COLUMN     "timeBlockId" TEXT;

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "BookingToken" ADD CONSTRAINT "BookingToken_timeBlockId_fkey" FOREIGN KEY ("timeBlockId") REFERENCES "TimeBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
