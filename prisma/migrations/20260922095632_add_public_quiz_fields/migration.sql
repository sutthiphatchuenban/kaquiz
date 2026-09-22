-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "category" TEXT,
ADD COLUMN     "copyCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "forkedFromId" TEXT,
ADD COLUMN     "playCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "quizzes_isPublished_updatedAt_idx" ON "quizzes"("isPublished", "updatedAt");

-- CreateIndex
CREATE INDEX "quizzes_isPublished_playCount_idx" ON "quizzes"("isPublished", "playCount");

-- CreateIndex
CREATE INDEX "quizzes_category_idx" ON "quizzes"("category");

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_forkedFromId_fkey" FOREIGN KEY ("forkedFromId") REFERENCES "quizzes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
