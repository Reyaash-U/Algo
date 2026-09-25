-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT,
    "noteId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "language" TEXT,
    "code" TEXT DEFAULT '',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submissions_userId_submittedAt_idx" ON "submissions"("userId", "submittedAt");

-- CreateIndex
CREATE INDEX "submissions_submittedAt_idx" ON "submissions"("submittedAt");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
