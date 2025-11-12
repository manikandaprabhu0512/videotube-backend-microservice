/*
  Warnings:

  - You are about to drop the column `videoId` on the `Like` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,likedVideo]` on the table `Like` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,likedComment]` on the table `Like` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,likedTweet]` on the table `Like` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `likedComment` to the `Like` table without a default value. This is not possible if the table is not empty.
  - Added the required column `likedTweet` to the `Like` table without a default value. This is not possible if the table is not empty.
  - Added the required column `likedVideo` to the `Like` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Like_userId_videoId_key";

-- AlterTable
ALTER TABLE "Like" DROP COLUMN "videoId",
ADD COLUMN     "likedComment" TEXT NOT NULL,
ADD COLUMN     "likedTweet" TEXT NOT NULL,
ADD COLUMN     "likedVideo" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_likedVideo_key" ON "Like"("userId", "likedVideo");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_likedComment_key" ON "Like"("userId", "likedComment");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_likedTweet_key" ON "Like"("userId", "likedTweet");
