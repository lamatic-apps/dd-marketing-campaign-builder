"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  ExternalLink,
  Check,
  FileText,
  Mail,
  MessageSquare,
  Facebook,
  Instagram,
  Twitter,
  Loader2,
  FolderOpen,
  Send,
  Sparkles,
  Pencil,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { type Campaign, type CampaignStatus, type Channel, getActiveChannels, statusDisplayMap } from "@/lib/campaign-data"
import { generateCampaign } from "@/lib/lamatic-api"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { ProductSelector, type SelectedItem } from "@/components/product-selector"
import { useCampaign } from "@/hooks/use-campaigns"

function getStatusConfig(status: CampaignStatus) {
  return statusDisplayMap[status] || { label: status || "Unknown", className: "bg-muted text-muted-foreground" }
}

const channelConfig: Record<Channel, { label: string; icon: any; color: string }> = {
  blog: { label: "Blog Post", icon: FileText, color: "bg-purple-500" },
  email: { label: "Email", icon: Mail, color: "bg-blue-500" },
  sms: { label: "SMS", icon: MessageSquare, color: "bg-green-500" },
  facebook: { label: "Facebook", icon: Facebook, color: "bg-[#1877F2]" },
  instagram: { label: "Instagram", icon: Instagram, color: "bg-gradient-to-r from-purple-500 to-pink-500" },
  twitter: { label: "Twitter/X", icon: Twitter, color: "bg-black" },
}

interface CampaignDetailProps {
  campaignId: string
}

export function CampaignDetail({ campaignId }: CampaignDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { campaign, loading, error, refetch } = useCampaign(campaignId)
  const [localCampaign, setLocalCampaign] = useState<Campaign | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editChannels, setEditChannels] = useState<Channel[]>([])
  const [editNotes, setEditNotes] = useState("")
  const [editProducts, setEditProducts] = useState<SelectedItem[]>([])

  // Delete confirmation state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const allChannels: { id: Channel; label: string; icon: any }[] = [
    { id: "blog", label: "Blog Post", icon: FileText },
    { id: "email", label: "Email", icon: Mail },
    { id: "sms", label: "SMS", icon: MessageSquare },
    { id: "facebook", label: "Facebook", icon: Facebook },
    { id: "instagram", label: "Instagram", icon: Instagram },
    { id: "twitter", label: "Twitter/X", icon: Twitter },
  ]

  // Sync from API campaign to local state
  useEffect(() => {
    if (campaign) {
      setLocalCampaign(campaign)
    }
  }, [campaign])

  // Update campaign via API
  const updateCampaignAPI = async (updates: Partial<Campaign>) => {
    if (!localCampaign) return

    const updated = { ...localCampaign, ...updates }
    setLocalCampaign(updated)

    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        throw new Error('Failed to update campaign')
      }

      await refetch()
    } catch (err) {
      console.error('Update failed:', err)
      toast({
        title: "Update failed",
        description: "Could not save changes.",
        variant: "destructive",
      })
    }
  }

  const handleGenerate = async () => {
    if (!localCampaign) return

    setIsGenerating(true)

    try {
      // Get product SKUs from products array
      const productSkus = localCampaign.products?.map((p: any) => p.sku) || []
      const activeChannels = getActiveChannels(localCampaign.channels || {})

      const data = await generateCampaign({
        topic: localCampaign.title,
        bundleId: "",
        products: productSkus,
        channels_blog: activeChannels.includes("blog") ? "true" : "false",
        channels_email: activeChannels.includes("email") ? "true" : "false",
        channels_sms: activeChannels.includes("sms") ? "true" : "false",
        channels_facebook: activeChannels.includes("facebook") ? "true" : "false",
        channels_instagram: activeChannels.includes("instagram") ? "true" : "false",
        channels_twitter: activeChannels.includes("twitter") ? "true" : "false",
        notes: localCampaign.notes || "",
        contentFocus: String(localCampaign.contentFocus || 3),
      })

      if (data.errors) {
        throw new Error(data.errors[0]?.message || "API Error")
      }

      const result = data.data?.executeWorkflow?.result

      // Update campaign with Google Drive links
      await updateCampaignAPI({
        status: "SCHEDULED",
        docUrl: result?.docUrl,
        folderUrl: result?.folderUrl,
      })

      setIsGenerating(false)

      toast({
        title: "Content generated!",
        description: "Your campaign content is ready in Google Docs.",
      })
    } catch (error: any) {
      console.error("Generation error:", error)
      setIsGenerating(false)

      toast({
        title: "Generation failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSendToReview = async () => {
    await updateCampaignAPI({ status: "PENDING_REVIEW" })
    toast({
      title: "Sent to review!",
      description: "Campaign has been sent to the team for review.",
    })
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete campaign')
      }

      toast({
        title: "Campaign deleted",
        description: "The campaign has been removed.",
      })

      router.push("/")
    } catch (err) {
      console.error('Delete failed:', err)
      toast({
        title: "Delete failed",
        description: "Could not delete campaign.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteOpen(false)
    }
  }

  const handleApprove = async () => {
    await updateCampaignAPI({ status: "APPROVED" })
    toast({
      title: "Campaign approved!",
      description: "Campaign is now approved and ready to publish.",
    })
  }

  const handleOpenEdit = () => {
    if (!localCampaign) return
    setEditTitle(localCampaign.title)
    setEditChannels(getActiveChannels(localCampaign.channels || {}))
    setEditNotes(localCampaign.notes || "")

    // Convert products to SelectedItem format
    const items: SelectedItem[] = localCampaign.products?.map((p: any) => ({
      type: 'product' as const,
      id: p.id || 0,
      sku: p.sku,
      name: p.name,
      price: p.price || 0,
    })) || []
    setEditProducts(items)
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!localCampaign || !editTitle.trim()) return

    // Convert channels array to Record format
    const channelsRecord: Record<string, boolean> = {}
    editChannels.forEach(c => channelsRecord[c] = true)

    await updateCampaignAPI({
      title: editTitle.trim(),
      channels: channelsRecord,
      notes: editNotes || undefined,
      products: editProducts.filter(p => p.type === 'product').map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
      })),
    })

    setEditOpen(false)

    toast({
      title: "Campaign updated!",
      description: "Campaign has been saved.",
    })
  }

  const toggleEditChannel = (channelId: Channel) => {
    setEditChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !localCampaign) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Campaign not found</p>
          <Button onClick={() => router.push("/")}>Back to Calendar</Button>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(localCampaign.status)
  const activeChannels = getActiveChannels(localCampaign.channels || {})

  const getChannelStatus = (channel: Channel) => {
    if (localCampaign.status === "DRAFT") return "not_started"
    if (localCampaign.status === "PENDING_REVIEW" || isGenerating) return "generating"
    if (localCampaign.docUrl) return "ready"
    return "not_started"
  }

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Calendar
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">{localCampaign.title}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-muted-foreground">
                  {localCampaign.scheduledDate
                    ? format(new Date(localCampaign.scheduledDate), "MMMM d, yyyy")
                    : "No date scheduled"}
                </span>
                <Badge variant="secondary" className={cn("text-xs", statusConfig.className)}>
                  {(localCampaign.status === "PENDING_REVIEW" || isGenerating) && (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  )}
                  {statusConfig.label}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {localCampaign.status === "DRAFT" && (
              <>
                <Button variant="outline" onClick={handleOpenEdit}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || activeChannels.length === 0}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </>
            )}
            {localCampaign.status === "SCHEDULED" && (
              <Button onClick={handleSendToReview} className="bg-primary">
                <Send className="w-4 h-4 mr-2" />
                Send to Review
              </Button>
            )}
            {localCampaign.status === "PENDING_REVIEW" && (
              <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
            )}
            {localCampaign.status === "APPROVED" && (
              <Badge className="bg-green-100 text-green-800 px-4 py-2">
                <Check className="w-4 h-4 mr-2" />
                Approved
              </Badge>
            )}
            {/* Delete button - always visible */}
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Featured Products */}
            {localCampaign.products && localCampaign.products.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                    Featured Products ({localCampaign.products.length})
                  </p>
                  <div className="space-y-3">
                    {localCampaign.products.map((product: any, index: number) => (
                      <div key={product?.sku || index} className="flex items-center gap-4 p-3 bg-gradient-to-r from-cyan-50/50 to-blue-50/50 rounded-lg border border-cyan-100/50">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-cyan-100 shadow-sm">
                          <FileText className="w-5 h-5 text-cyan-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product?.name}</p>
                          <p className="text-xs text-muted-foreground">SKU: {product?.sku}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-primary">
                            ${product?.price?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Content Focus */}
            <Card className="mb-6 overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  <div className="flex-shrink-0 w-48 bg-gradient-to-br from-cyan-50 to-blue-50 border-r p-4 flex flex-col justify-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Content Focus</p>
                    <p className="font-semibold text-lg">
                      {(localCampaign.contentFocus || 3) === 1 && "Educational"}
                      {(localCampaign.contentFocus || 3) === 2 && "Mostly Educational"}
                      {(localCampaign.contentFocus || 3) === 3 && "Balanced"}
                      {(localCampaign.contentFocus || 3) === 4 && "Product-Leaning"}
                      {(localCampaign.contentFocus || 3) === 5 && "Product-Focused"}
                    </p>
                  </div>
                  <div className="flex-1 p-4 flex flex-col justify-center">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((step) => (
                          <div
                            key={step}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${(localCampaign.contentFocus || 3) === step
                              ? "bg-primary text-primary-foreground"
                              : step < (localCampaign.contentFocus || 3)
                                ? "bg-primary/30"
                                : "bg-muted"
                              }`}
                          >
                            {(localCampaign.contentFocus || 3) === step && step}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Google Drive Links */}
            {(localCampaign.docUrl || localCampaign.folderUrl) && (
              <Card className="mb-6 border-green-200 bg-green-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-700 text-base">
                    <Check className="w-5 h-5" />
                    Content Generated
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid md:grid-cols-2 gap-4">
                    {localCampaign.docUrl && (
                      <a
                        href={localCampaign.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-white border rounded-lg hover:border-primary hover:shadow-md transition-all group"
                      >
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium group-hover:text-primary">View Content Document</p>
                          <p className="text-sm text-muted-foreground">Open in Google Docs</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                      </a>
                    )}
                    {localCampaign.folderUrl && (
                      <a
                        href={localCampaign.folderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-white border rounded-lg hover:border-primary hover:shadow-md transition-all group"
                      >
                        <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                          <FolderOpen className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium group-hover:text-primary">Open Campaign Folder</p>
                          <p className="text-sm text-muted-foreground">Add images & assets</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <h2 className="text-lg font-medium mb-2">Campaign Channels</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {localCampaign.status === "DRAFT"
                ? "Click 'Generate Content' to create assets for all selected channels."
                : localCampaign.status === "PENDING_REVIEW" || isGenerating
                  ? "AI is generating content for your channels... This may take 60-90 seconds."
                  : "Content has been generated and saved to Google Docs."}
            </p>

            <div className="grid gap-3">
              {activeChannels.map((channel) => {
                const config = channelConfig[channel]
                const Icon = config.icon
                const status = getChannelStatus(channel)

                return (
                  <Card key={channel} className="overflow-hidden">
                    <div className="flex items-center">
                      <div className={cn("w-14 h-14 flex items-center justify-center shrink-0", config.color)}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <h3 className="font-medium text-sm">{config.label}</h3>
                            {status === "generating" && (
                              <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Generating...
                              </p>
                            )}
                            {status === "not_started" && (
                              <p className="text-xs text-muted-foreground mt-0.5">Waiting for generation</p>
                            )}
                            {status === "ready" && (
                              <p className="text-xs text-green-600 mt-0.5">Content ready</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-4">
                            {status === "ready" && localCampaign.docUrl && (
                              <Button size="sm" className="h-8" asChild>
                                <a href={localCampaign.docUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                  Open in Docs
                                </a>
                              </Button>
                            )}
                            {status === "generating" && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                In Progress
                              </Badge>
                            )}
                            {status === "not_started" && (
                              <Badge variant="outline" className="text-muted-foreground">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Campaign Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Edit Campaign
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editTitle">Campaign Title</Label>
              <Input
                id="editTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Campaign title..."
              />
            </div>

            <div className="space-y-3">
              <Label>Channels to Generate</Label>
              <div className="grid grid-cols-2 gap-2">
                {allChannels.map((channel) => {
                  const Icon = channel.icon
                  const isSelected = editChannels.includes(channel.id)
                  return (
                    <label
                      key={channel.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        isSelected ? "bg-primary/10 border-primary" : "bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleEditChannel(channel.id)}
                      />
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{channel.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Featured Products</Label>
              <ProductSelector
                selectedProducts={editProducts}
                onSelectionChange={setEditProducts}
                maxSelections={30}
                placeholder="Search products to add..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editNotes">Notes / Special Instructions</Label>
              <Textarea
                id="editNotes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="e.g., Focus on EVO products, highlight winter diving..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={editChannels.length === 0}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Campaign
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete <strong>"{localCampaign.title}"</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Campaign
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
