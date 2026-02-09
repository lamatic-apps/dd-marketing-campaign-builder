-- Divers Direct Campaign Database Schema
-- Generated from Prisma schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Role enum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- Create CampaignStatus enum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'COMPLETED', 'ARCHIVED');

-- Create ActivityAction enum
CREATE TYPE "ActivityAction" AS ENUM ('CREATED', 'EDITED', 'SENT_FOR_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- Create ReviewStatus enum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- Users table (for future OAuth integration)
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Create unique index on User email
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Campaign table
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledDate" TIMESTAMP(3),
    "channels" JSONB NOT NULL,
    "products" JSONB,
    "contentFocus" INTEGER NOT NULL DEFAULT 3,
    "notes" TEXT,
    "generatedContent" JSONB,
    "docUrl" TEXT,
    "folderUrl" TEXT,
    "createdById" UUID,
    "lastModifiedById" UUID,
    "assignedToId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CampaignActivity table (audit trail)
CREATE TABLE "CampaignActivity" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "campaignId" UUID NOT NULL,
    "userId" UUID,
    "userEmail" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignActivity_pkey" PRIMARY KEY ("id")
);

-- CampaignReview table
CREATE TABLE "CampaignReview" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "campaignId" UUID NOT NULL,
    "requestedById" UUID,
    "requestedByEmail" TEXT NOT NULL,
    "reviewerId" UUID,
    "reviewerEmail" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "CampaignReview_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" 
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_lastModifiedById_fkey" 
    FOREIGN KEY ("lastModifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_assignedToId_fkey" 
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CampaignActivity" ADD CONSTRAINT "CampaignActivity_campaignId_fkey" 
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignActivity" ADD CONSTRAINT "CampaignActivity_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CampaignReview" ADD CONSTRAINT "CampaignReview_campaignId_fkey" 
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignReview" ADD CONSTRAINT "CampaignReview_requestedById_fkey" 
    FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CampaignReview" ADD CONSTRAINT "CampaignReview_reviewerId_fkey" 
    FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create function to auto-update updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to Campaign table
CREATE TRIGGER update_campaign_updated_at
    BEFORE UPDATE ON "Campaign"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
