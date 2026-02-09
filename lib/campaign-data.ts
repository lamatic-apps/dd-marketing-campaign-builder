// Campaign types matching the database schema
export type CampaignStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "COMPLETED" | "ARCHIVED"

// Legacy status mapping for UI
export const statusDisplayMap: Record<CampaignStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  PENDING_REVIEW: { label: "Pending Review", className: "bg-purple-100 text-purple-800" },
  APPROVED: { label: "Approved", className: "bg-green-100 text-green-800" },
  SCHEDULED: { label: "Scheduled", className: "bg-blue-100 text-blue-800" },
  PUBLISHED: { label: "Published", className: "bg-emerald-100 text-emerald-800" },
  COMPLETED: { label: "Completed", className: "bg-gray-100 text-gray-800" },
  ARCHIVED: { label: "Archived", className: "bg-red-100 text-red-800" },
}

export type Channel = "blog" | "email" | "sms" | "facebook" | "instagram" | "twitter"

// Database Campaign interface
export interface Campaign {
  id: string
  title: string
  topic: string
  status: CampaignStatus
  scheduledDate?: string  // ISO date string
  channels: Record<string, boolean>  // {blog: true, email: true, ...}
  products?: Array<{
    id?: number
    name: string
    sku: string
    price?: number
  }>
  contentFocus: number  // 1-5 scale
  notes?: string
  generatedContent?: {
    blog?: BlogContent
    email?: EmailContent
    sms?: SMSMessage[]
    facebook?: SocialContent
    instagram?: SocialContent
    twitter?: SocialContent
  }
  docUrl?: string
  folderUrl?: string
  createdById?: string
  lastModifiedById?: string
  assignedToId?: string
  createdAt: string
  updatedAt: string
}

export interface BlogContent {
  title: string
  body: string
  seoKeyword?: string
  wordCount?: number
  readingTime?: number
}

export interface EmailContent {
  subject: string
  previewText?: string
  body: string
  ctaText?: string
  ctaUrl?: string
}

export interface SMSMessage {
  text: string
  characterCount?: number
}

export interface SocialContent {
  caption: string
  hashtags?: string[]
  imagePrompt?: string
  imageStyle?: string
}

// Helper to get active channels as array
export function getActiveChannels(channels: Record<string, boolean>): Channel[] {
  return Object.entries(channels)
    .filter(([_, active]) => active)
    .map(([channel]) => channel as Channel)
}

// Helper to convert channel array to record
export function channelsToRecord(channels: Channel[]): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  channels.forEach(c => result[c] = true)
  return result
}

// Empty sample campaigns - data comes from database now
export const sampleCampaigns: Campaign[] = []

// Sample products for the product selector
export const sampleProducts = [
  { name: "Mares Reef 3mm Wetsuit", sku: "MARES-REEF-3MM", price: 199.99 },
  { name: "ScubaPro MK25 Regulator", sku: "SP-MK25-REG", price: 649.99 },
  { name: "Wetsuit Cleaner & Conditioner", sku: "WET-CLEAN-16OZ", price: 24.99 },
  { name: "Cressi Leonardo Dive Computer", sku: "CRESSI-LEO-DC", price: 299.99 },
  { name: "Aqua Lung Micromask", sku: "AL-MICRO-BLK", price: 89.99 },
  { name: "Mares Avanti Quattro Fins", sku: "MARES-AQ4-L", price: 159.99 },
  { name: "Dive Rite Travel EXP Wing", sku: "DR-TRAVEL-EXP", price: 425.0 },
  { name: "Halcyon Eclipse Dive Light", sku: "HAL-ECL-30", price: 375.0 },
]
