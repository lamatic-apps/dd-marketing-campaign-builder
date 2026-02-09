"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  FileText,
  Mail,
  MessageSquare,
  Facebook,
  Instagram,
  Twitter,
  MoreHorizontal,
  Eye,
  Copy,
  Loader2,
  Check,
  FolderOpen,
  ExternalLink,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { type Campaign, type CampaignStatus, type Channel, statusDisplayMap, getActiveChannels } from "@/lib/campaign-data"
import { NewCampaignModal } from "@/components/new-campaign-modal"
import { useCampaigns } from "@/hooks/use-campaigns"
import { format } from "date-fns"

const channelIcons: Record<Channel, React.ReactNode> = {
  blog: <FileText className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  sms: <MessageSquare className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
}

function getStatusConfig(status: CampaignStatus) {
  return statusDisplayMap[status] || { label: status || "Unknown", className: "bg-muted text-muted-foreground" }
}

export function CampaignsList() {
  const router = useRouter()
  const { campaigns, loading, error, refetch, createCampaign } = useCampaigns()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleCampaignCreated = async (campaignData: any) => {
    // The modal will call createCampaign, we just need to close and refetch
    await refetch()
  }

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.topic.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading campaigns...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">Error loading campaigns: {error}</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">All Campaigns</h1>
          <Badge variant="outline" className="text-xs">
            {campaigns.length} total
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="pl-9 w-64 bg-background"
            />
          </div>

          {/* Refresh Button */}
          <Button onClick={() => refetch()} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>

          {/* New Campaign Button */}
          <Button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 p-6 overflow-auto">
        {filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FileText className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg">No campaigns found</p>
            <p className="text-sm">Create your first campaign to get started</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Campaign Name</TableHead>
                  <TableHead className="font-semibold">Topic</TableHead>
                  <TableHead className="font-semibold">Scheduled Date</TableHead>
                  <TableHead className="font-semibold">Channels</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => {
                  const statusConfig = getStatusConfig(campaign.status)
                  const activeChannels = getActiveChannels(campaign.channels || {})
                  return (
                    <TableRow
                      key={campaign.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/campaigns/${campaign.id}`)}
                    >
                      <TableCell className="font-medium">{campaign.title}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {campaign.topic}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {campaign.scheduledDate
                          ? format(new Date(campaign.scheduledDate), "MMM d, yyyy")
                          : <span className="text-muted-foreground/50">Not scheduled</span>
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {activeChannels.map((channel) => (
                            <span key={channel} className="text-muted-foreground" title={channel}>
                              {channelIcons[channel]}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-xs", statusConfig.className)}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/campaigns/${campaign.id}`)
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {campaign.docUrl && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(campaign.docUrl, '_blank')
                                }}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open Document
                              </DropdownMenuItem>
                            )}
                            {campaign.folderUrl && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(campaign.folderUrl, '_blank')
                                }}
                              >
                                <FolderOpen className="w-4 h-4 mr-2" />
                                Open Folder
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                navigator.clipboard.writeText(campaign.id)
                              }}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy ID
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* New Campaign Modal */}
      <NewCampaignModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedDate={null}
        onCampaignCreated={handleCampaignCreated}
      />
    </div>
  )
}
