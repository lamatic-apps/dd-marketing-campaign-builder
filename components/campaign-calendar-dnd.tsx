"use client"

import type React from "react"
import { useState, useCallback, useId } from "react"
import { useRouter } from "next/navigation"
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
} from "@dnd-kit/core"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Plus, Loader2, Check, GripVertical, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { statusDisplayMap, type Campaign, type CampaignStatus } from "@/lib/campaign-data"
import { NewCampaignModal } from "@/components/new-campaign-modal"
import { useCampaigns } from "@/hooks/use-campaigns"
import { getESTDateParts } from "@/lib/date-utils"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
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

// Draggable Campaign Card
function DraggableCampaignCard({ campaign, onClick }: { campaign: Campaign; onClick: (e: React.MouseEvent) => void }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: campaign.id,
        data: campaign,
    })

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            zIndex: isDragging ? 1000 : undefined,
        }
        : undefined

    const statusConfig = getStatusConfig(campaign.status)

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group p-2 rounded-lg bg-card border border-border hover:border-primary/50 transition-all cursor-pointer shadow-sm",
                isDragging && "opacity-50 shadow-lg ring-2 ring-primary"
            )}
            onClick={onClick}
        >
            <div className="flex items-start gap-1.5">
                <div
                    {...attributes}
                    {...listeners}
                    className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing pt-0.5"
                >
                    <GripVertical className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{campaign.title}</p>
                    <Badge
                        variant="secondary"
                        className={cn("text-[10px] px-1.5 py-0 mt-1.5 font-normal", statusConfig.className)}
                    >
                        {campaign.status === "PENDING_REVIEW" && <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />}
                        {campaign.status === "APPROVED" && <Check className="w-2.5 h-2.5 mr-1" />}
                        {statusConfig.label}
                    </Badge>
                </div>
            </div>
        </div>
    )
}

// Droppable Day Cell
function DroppableDay({
    day,
    month,
    year,
    campaigns,
    isToday,
    onDateClick,
    onCampaignClick,
}: {
    day: number | null
    month: number
    year: number
    campaigns: Campaign[]
    isToday: boolean
    onDateClick: (day: number) => void
    onCampaignClick: (campaign: Campaign, e: React.MouseEvent) => void
}) {
    const dateId = day ? `${year}-${month}-${day}` : "empty"
    const { isOver, setNodeRef } = useDroppable({ id: dateId })

    if (!day) {
        return <div className="min-h-[120px] p-2 border-b border-border bg-muted/20" />
    }

    return (
        <div
            ref={setNodeRef}
            onClick={() => onDateClick(day)}
            className={cn(
                "min-h-[120px] p-2 border-b border-border cursor-pointer transition-all",
                "hover:bg-muted/30",
                isOver && "bg-primary/10 ring-2 ring-primary ring-inset"
            )}
        >
            <span
                className={cn(
                    "inline-flex items-center justify-center w-7 h-7 text-sm rounded-full transition-colors",
                    isToday && "bg-primary text-primary-foreground font-medium"
                )}
            >
                {day}
            </span>
            <div className="mt-1 space-y-1.5">
                {campaigns.map((campaign) => (
                    <DraggableCampaignCard
                        key={campaign.id}
                        campaign={campaign}
                        onClick={(e) => onCampaignClick(campaign, e)}
                    />
                ))}
            </div>
        </div>
    )
}

// Drag overlay for better visual feedback
function CampaignDragOverlay({ campaign }: { campaign: Campaign | null }) {
    if (!campaign) return null

    const statusConfig = getStatusConfig(campaign.status)

    return (
        <div className="p-2 rounded-lg bg-card border-2 border-primary shadow-xl cursor-grabbing w-48">
            <p className="text-xs font-medium text-foreground truncate">{campaign.title}</p>
            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 mt-1.5 font-normal", statusConfig.className)}>
                {statusConfig.label}
            </Badge>
        </div>
    )
}

export function CampaignCalendarDragDrop() {
    const router = useRouter()
    const dndId = useId() // Stable ID for DndContext
    const { campaigns, loading, error, refetch, updateCampaign } = useCampaigns()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [viewMode, setViewMode] = useState<"month" | "week">("month")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null)

    const handleCampaignCreated = useCallback(() => {
        // Refetch campaigns from database after a new one is created
        refetch(true)
    }, [refetch])

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDayOfMonth = getFirstDayOfMonth(year, month)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

    const getCampaignsForDate = useCallback(
        (day: number) => {
            return campaigns.filter((campaign) => {
                if (!campaign.scheduledDate) return false
                // Parse the scheduledDate in EST timezone
                const { year: campYear, month: campMonth, day: campDay } = getESTDateParts(campaign.scheduledDate)
                return campYear === year && campMonth === month && campDay === day
            })
        },
        [campaigns, year, month]
    )

    const handleDateClick = (day: number) => {
        setSelectedDate(new Date(year, month, day))
        setIsModalOpen(true)
    }

    const handleCampaignClick = (campaign: Campaign, e: React.MouseEvent) => {
        e.stopPropagation()
        router.push(`/campaigns/${campaign.id}`)
    }

    const handleDragStart = (event: DragStartEvent) => {
        const campaign = campaigns.find((c) => c.id === event.active.id)
        setActiveCampaign(campaign || null)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveCampaign(null)

        const { active, over } = event
        if (!over || !active) return

        const campaignId = active.id as string
        const dropZoneId = over.id as string

        // Parse date from dropzone ID
        const [dropYear, dropMonth, dropDay] = dropZoneId.split("-").map(Number)
        if (isNaN(dropDay)) return

        // Create date at noon EST to avoid timezone boundary issues
        const newDate = new Date(dropYear, dropMonth, dropDay, 12, 0, 0)
        const isoDate = newDate.toISOString()

        // Update campaign date via API
        await updateCampaign(campaignId, { scheduledDate: isoDate })
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
    while (weeks[weeks.length - 1].length < 7) {
        weeks[weeks.length - 1].push(null)
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-card/50">
                <h1 className="text-2xl font-semibold text-foreground">Campaign Calendar</h1>
                <div className="flex items-center gap-4">
                    {/* Month Navigation */}
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-medium w-36 text-center">
                            {MONTHS[month]} {year}
                        </span>
                        <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
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
                                    : "bg-background text-foreground hover:bg-muted"
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
                                    : "bg-background text-foreground hover:bg-muted"
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

            {/* Calendar Grid with Drag & Drop */}
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
                    <DndContext
                        id={dndId}
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
                            {/* Day Headers */}
                            <div className="grid grid-cols-7 border-b border-border bg-muted/50">
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
                                        const campaigns = day ? getCampaignsForDate(day) : []
                                        const isToday =
                                            day === new Date().getDate() &&
                                            month === new Date().getMonth() &&
                                            year === new Date().getFullYear()

                                        return (
                                            <DroppableDay
                                                key={dayIndex}
                                                day={day}
                                                month={month}
                                                year={year}
                                                campaigns={campaigns}
                                                isToday={isToday}
                                                onDateClick={handleDateClick}
                                                onCampaignClick={handleCampaignClick}
                                            />
                                        )
                                    })}
                                </div>
                            ))}
                        </div>

                        <DragOverlay>
                            <CampaignDragOverlay campaign={activeCampaign} />
                        </DragOverlay>
                    </DndContext>
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
