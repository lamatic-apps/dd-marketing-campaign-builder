"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Slider } from "@/components/ui/slider"
import { ProductSelector, type SelectedItem } from "@/components/product-selector"
import { localDateToESTISOString } from "@/lib/date-utils"
import {
  CalendarIcon,
  FileText,
  Mail,
  MessageSquare,
  Facebook,
  Instagram,
  Twitter,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import type { Campaign, Channel } from "@/lib/campaign-data"

const channels = [
  { id: "blog", label: "Blog Post", sublabel: "(800-1200 words)", icon: FileText },
  { id: "email", label: "Email Campaign", icon: Mail },
  { id: "sms", label: "SMS", sublabel: "(160 chars)", icon: MessageSquare },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "twitter", label: "Twitter/X", icon: Twitter },
]

interface NewCampaignModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date | null
  onCampaignCreated?: (campaign: Campaign) => void
}

export function NewCampaignModal({ open, onOpenChange, selectedDate, onCampaignCreated }: NewCampaignModalProps) {
  const { toast } = useToast()
  const [topic, setTopic] = useState("")
  const [date, setDate] = useState<Date | undefined>(selectedDate || undefined)
  const [selectedProducts, setSelectedProducts] = useState<SelectedItem[]>([])
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [contentFocus, setContentFocus] = useState(3) // Default: balanced (1=educational, 5=product-focused)
  const [dateOpen, setDateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update date when modal opens or selectedDate prop changes
  useEffect(() => {
    if (open && selectedDate) {
      setDate(selectedDate)
    }
  }, [open, selectedDate])

  const handleSelectAll = () => {
    if (selectedChannels.length === channels.length) {
      setSelectedChannels([])
    } else {
      setSelectedChannels(channels.map((c) => c.id))
    }
  }

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]
    )
  }

  const handleSubmit = async () => {
    if (!topic.trim()) {
      toast({ title: "Error", description: "Please enter a campaign topic", variant: "destructive" })
      return
    }
    if (selectedChannels.length === 0) {
      toast({ title: "Error", description: "Please select at least one channel", variant: "destructive" })
      return
    }

    setIsSubmitting(true)

    try {
      // Convert channels array to record format
      const channelsRecord: Record<string, boolean> = {}
      selectedChannels.forEach(c => channelsRecord[c] = true)

      // Create campaign via API
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: topic,
          topic: topic,
          scheduledDate: date ? localDateToESTISOString(date) : undefined,
          channels: channelsRecord,
          products: selectedProducts.filter(p => p.type === 'product').map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.price,
          })),
          termSales: selectedProducts.filter(p => p.type === 'term_sale').map(ts => ({
            term_sale_id: ts.term_sale_id,
            productCount: ts.productCount,
            products: ts.products
          })),
          contentFocus,
          notes: notes || undefined,
          userEmail: localStorage.getItem('user-email') || 'anonymous@diversdirect.com',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create campaign')
      }

      const { campaign } = await response.json()

      // Call callback to notify parent
      if (onCampaignCreated) {
        await onCampaignCreated(campaign)
      }

      toast({
        title: "Campaign created!",
        description: `"${topic}" has been saved to the database.`,
      })

      onOpenChange(false)

      // Reset form
      setTopic("")
      setSelectedProducts([])
      setSelectedChannels([])
      setNotes("")
      setContentFocus(3)
    } catch (error: any) {
      console.error('Error creating campaign:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = topic.length > 0 && selectedChannels.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Create New Campaign
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic" className="text-sm font-medium">
              Topic / Campaign Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Winter Wetsuit Sale, Diving Safety Tips..."
              className="bg-background"
            />
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Target Date</Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d)
                    setDateOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Featured Products - Multi-select with search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Featured Products{" "}
            </Label>
            <ProductSelector
              selectedProducts={selectedProducts}
              onSelectionChange={setSelectedProducts}
              maxSelections={30}
              placeholder="Search 3000+ products by name or SKU..."
            />
          </div>

          {/* Channels */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Channels to Generate <span className="text-destructive">*</span>
              </Label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-primary hover:underline"
              >
                {selectedChannels.length === channels.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {channels.map((channel) => {
                const Icon = channel.icon
                return (
                  <label
                    key={channel.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      selectedChannels.includes(channel.id)
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                    )}
                  >
                    <Checkbox
                      checked={selectedChannels.includes(channel.id)}
                      onCheckedChange={() => toggleChannel(channel.id)}
                    />
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{channel.label}</span>
                      {channel.sublabel && (
                        <span className="text-xs text-muted-foreground ml-1">{channel.sublabel}</span>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Content Focus Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Content Focus</Label>
              <span className="text-xs text-muted-foreground">
                {contentFocus === 1 && "Fully Educational"}
                {contentFocus === 2 && "Mostly Educational"}
                {contentFocus === 3 && "Balanced"}
                {contentFocus === 4 && "Product-Leaning"}
                {contentFocus === 5 && "Fully Product-Focused"}
              </span>
            </div>
            <div className="space-y-2">
              <Slider
                value={[contentFocus]}
                onValueChange={(value) => setContentFocus(value[0])}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Educational</span>
                <span>Product-Focused</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Additional Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific angles, promotions, or details to include..."
              className="bg-background resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-primary hover:bg-primary/90 min-w-[140px]"
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Add to Calendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
