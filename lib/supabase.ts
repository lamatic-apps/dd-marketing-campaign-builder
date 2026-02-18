import { createClient } from "@supabase/supabase-js"

// Supabase needs NEXT_PUBLIC_ prefix since it's used client-side
// For Vercel: Add these in the Vercel dashboard as environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Anon client — for client-side auth checks only
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service role client — bypasses RLS, for server-side API routes only
// NEVER expose this on the client side
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Type definitions matching our database schema
export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';
export type CampaignStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'COMPLETED' | 'ARCHIVED';
export type ActivityAction = 'CREATED' | 'EDITED' | 'SENT_FOR_REVIEW' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface User {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    role: Role;
    createdAt: string;
    lastLoginAt?: string;
}

export interface Campaign {
    id: string;
    title: string;
    topic: string;
    status: CampaignStatus;
    scheduledDate?: string;
    channels: Record<string, boolean>;
    imageChannels?: Record<string, boolean>;
    products?: Array<{ sku: string; name: string; price?: number }>;
    contentFocus: number;
    notes?: string;
    generatedContent?: Record<string, any>;
    docUrl?: string;
    folderUrl?: string;
    createdById?: string;
    lastModifiedById?: string;
    assignedToId?: string;
    createdAt: string;
    updatedAt: string;
    // Relations (when joined)
    createdBy?: User;
    lastModifiedBy?: User;
    assignedTo?: User;
}

export interface CampaignActivity {
    id: string;
    campaignId: string;
    userId?: string;
    userEmail: string;
    action: ActivityAction;
    details?: Record<string, any>;
    createdAt: string;
    // Relations
    user?: User;
    campaign?: Campaign;
}

export interface CampaignReview {
    id: string;
    campaignId: string;
    requestedById?: string;
    requestedByEmail: string;
    reviewerId?: string;
    reviewerEmail?: string;
    status: ReviewStatus;
    comments?: string;
    createdAt: string;
    respondedAt?: string;
    // Relations
    requestedBy?: User;
    reviewer?: User;
    campaign?: Campaign;
}

// Legacy Product interface (for product selector)
export interface Product {
    id: number
    sku: string
    name: string
    price: number
    is_visible: boolean
}
