"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Plus, Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { type Campaign, type CampaignStatus, statusDisplayMap } from "@/lib/campaign-data"
import { NewCampaignModal } from "@/components/new-campaign-modal"
import { useCampaigns } from "@/hooks/use-campaigns"
import { getESTDateParts, getTodayEST, createESTDate } from "@/lib/date-utils"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function getStatusConfig(status: CampaignStatus) {
  return statusDisplayMap[status] || { label: status || "Unknown", className: "bg-muted text-muted-foreground" }
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export function CampaignCalendar() {
  const router = useRouter()
  const { campaigns, loading, error, refetch } = useCampaigns()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"month" | "week">("month")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDayOfMonth = getFirstDayOfMonth(year, month)

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const getCampaignsForDate = (day: number) => {
    return campaigns.filter((campaign) => {
      if (!campaign.scheduledDate) return false
      // Parse the scheduledDate in EST timezone
      const { year: campYear, month: campMonth, day: campDay } = getESTDateParts(campaign.scheduledDate)
      return campYear === year && campMonth === month && campDay === day
    })
  }

  const handleDateClick = (day: number) => {
    setSelectedDate(new Date(year, month, day))
    setIsModalOpen(true)
  }

  const handleCampaignClick = (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/campaigns/${campaign.id}`)
  }

  const handleCampaignCreated = () => {
    // Do a silent refetch to get the latest data from database
    // This won't show loading state but will update the campaigns list
    refetch(true)
  }

  // Build calendar grid
  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  const weeks: (number | null)[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }
  // Pad last week if necessary
  while (weeks[weeks.length - 1].length < 7) {
    weeks[weeks.length - 1].push(null)
  }

  // Count campaigns this month
  const monthCampaigns = campaigns.filter((c) => {
    if (!c.scheduledDate) return false
    const d = new Date(c.scheduledDate)
    return d.getFullYear() === year && d.getMonth() === month
  })

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">Campaign Calendar</h1>
          <Badge variant="outline" className="text-xs">
            {monthCampaigns.length} this month
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium w-36 text-center">
              {MONTHS[month]} {year}
            </span>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* View Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("month")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "month"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-muted",
              )}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "week"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-muted",
              )}
            >
              Week
            </button>
          </div>

          {/* Refresh Button */}
          <Button onClick={() => refetch()} variant="outline" size="icon" disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>

          {/* New Campaign Button */}
          <Button
            onClick={() => {
              setSelectedDate(new Date())
              setIsModalOpen(true)
            }}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-6 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading campaigns...
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <p className="text-destructive">Error loading campaigns: {error}</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-border bg-muted">
              {DAYS.map((day) => (
                <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Weeks */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 divide-x divide-border">
                {week.map((day, dayIndex) => {
                  const dayCampaigns = day ? getCampaignsForDate(day) : []
                  const isToday =
                    day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()

                  return (
                    <div
                      key={dayIndex}
                      onClick={() => day && handleDateClick(day)}
                      className={cn(
                        "min-h-[120px] p-2 border-b border-border cursor-pointer transition-colors hover:bg-muted/50",
                        !day && "bg-muted/30 cursor-default",
                      )}
                    >
                      {day && (
                        <>
                          <span
                            className={cn(
                              "inline-flex items-center justify-center w-7 h-7 text-sm rounded-full",
                              isToday && "bg-primary text-primary-foreground font-medium",
                            )}
                          >
                            {day}
                          </span>
                          <div className="mt-1 space-y-1">
                            {dayCampaigns.map((campaign) => {
                              const statusConfig = getStatusConfig(campaign.status)
                              return (
                                <div
                                  key={campaign.id}
                                  onClick={(e) => handleCampaignClick(campaign, e)}
                                  className="p-1.5 rounded bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer"
                                >
                                  <p className="text-xs font-medium text-foreground truncate">{campaign.title}</p>
                                  <Badge
                                    variant="secondary"
                                    className={cn("text-[10px] px-1 py-0 mt-1", statusConfig.className)}
                                  >
                                    {statusConfig.label}
                                  </Badge>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Campaign Modal */}
      <NewCampaignModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedDate={selectedDate}
        onCampaignCreated={handleCampaignCreated}
      />
    </div>
  )
}
