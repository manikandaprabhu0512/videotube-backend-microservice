/*
  Warnings:

  - The primary key for the `VideoTubePlaylist` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "VideoTubePlaylist" DROP CONSTRAINT "VideoTubePlaylist_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "thumbnail" SET DEFAULT ARRAY[]::TEXT[],
ADD CONSTRAINT "VideoTubePlaylist_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "VideoTubePlaylist_id_seq";
