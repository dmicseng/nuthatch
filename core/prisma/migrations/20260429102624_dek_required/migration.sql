/*
  Warnings:

  - Made the column `dek_encrypted` on table `organizations` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "dek_encrypted" SET NOT NULL;
