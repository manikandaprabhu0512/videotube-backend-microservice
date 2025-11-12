/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `VideoTubePlaylist` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "VideoTubePlaylist_name_key" ON "VideoTubePlaylist"("name");
