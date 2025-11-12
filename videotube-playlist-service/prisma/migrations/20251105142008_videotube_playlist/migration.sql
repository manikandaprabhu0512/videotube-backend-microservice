-- CreateTable
CREATE TABLE "VideoTubePlaylist" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnail" TEXT[],
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "videos" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "VideoTubePlaylist_pkey" PRIMARY KEY ("id")
);
