-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('skirt', 'top', 'outer', 'accessory', 'foundation', 'footwear');

-- CreateEnum
CREATE TYPE "Cut" AS ENUM ('JSK', 'OP', 'SK', 'Blouse', 'Cardigan', 'Coat', 'Cape', 'Headdress', 'Hairbow', 'Wristcuff', 'Bag', 'Pannier', 'Shoes', 'Socks', 'Other');

-- CreateEnum
CREATE TYPE "BaseColor" AS ENUM ('black', 'white', 'red', 'pink', 'blue', 'green', 'purple', 'brown', 'yellow', 'multicolor', 'other');

-- CreateEnum
CREATE TYPE "WardrobeStatus" AS ENUM ('wishlist', 'on_order', 'owned');

-- CreateEnum
CREATE TYPE "Substyle" AS ENUM ('sweet', 'gothic', 'classic', 'punk', 'other');

-- CreateEnum
CREATE TYPE "ReminderKind" AS ENUM ('manual_release', 'release_from_post', 'other');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('outfit', 'tutorial', 'official', 'encyclopedia', 'brand_release');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('draft', 'published', 'hidden');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "nickname" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUri" TEXT,
    "yearsInLolita" INTEGER,
    "preferredSubstyles" "Substyle"[],
    "favoriteBrandIds" TEXT[],
    "reduceMotion" BOOLEAN NOT NULL DEFAULT false,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ItemCategory" NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variant" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "baseColor" "BaseColor" NOT NULL,
    "cut" "Cut" NOT NULL,
    "catalogImageUri" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WardrobeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "status" "WardrobeStatus" NOT NULL,
    "size" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "userImageUris" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WardrobeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreorderRecord" (
    "id" TEXT NOT NULL,
    "wardrobeEntryId" TEXT NOT NULL,
    "depositAmountCny" DECIMAL(12,2) NOT NULL,
    "depositPaidAt" TIMESTAMP(3),
    "balanceAmountCny" DECIMAL(12,2) NOT NULL,
    "balanceDueAt" DATE NOT NULL,
    "balancePaid" BOOLEAN NOT NULL DEFAULT false,
    "balancePaidAt" TIMESTAMP(3),
    "expectedArrivalAt" DATE,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreorderRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "kind" "ReminderKind" NOT NULL DEFAULT 'manual_release',
    "sourcePostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "coverUri" TEXT,
    "releaseAt" DATE,
    "coordinateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostVariant" (
    "postId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PostVariant_pkey" PRIMARY KEY ("postId","variantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE INDEX "Item_brandId_idx" ON "Item"("brandId");

-- CreateIndex
CREATE INDEX "Item_name_idx" ON "Item"("name");

-- CreateIndex
CREATE INDEX "Variant_itemId_idx" ON "Variant"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Variant_itemId_colorName_cut_key" ON "Variant"("itemId", "colorName", "cut");

-- CreateIndex
CREATE INDEX "WardrobeEntry_userId_status_idx" ON "WardrobeEntry"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WardrobeEntry_userId_variantId_key" ON "WardrobeEntry"("userId", "variantId");

-- CreateIndex
CREATE INDEX "PreorderRecord_wardrobeEntryId_idx" ON "PreorderRecord"("wardrobeEntryId");

-- CreateIndex
CREATE INDEX "PreorderRecord_balanceDueAt_idx" ON "PreorderRecord"("balanceDueAt");

-- CreateIndex
CREATE INDEX "CalendarReminder_userId_at_idx" ON "CalendarReminder"("userId", "at");

-- CreateIndex
CREATE INDEX "Post_type_status_idx" ON "Post"("type", "status");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardrobeEntry" ADD CONSTRAINT "WardrobeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardrobeEntry" ADD CONSTRAINT "WardrobeEntry_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreorderRecord" ADD CONSTRAINT "PreorderRecord_wardrobeEntryId_fkey" FOREIGN KEY ("wardrobeEntryId") REFERENCES "WardrobeEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarReminder" ADD CONSTRAINT "CalendarReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVariant" ADD CONSTRAINT "PostVariant_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVariant" ADD CONSTRAINT "PostVariant_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
