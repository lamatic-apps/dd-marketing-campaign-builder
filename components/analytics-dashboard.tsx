"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DollarSign,
    Mail,
    MessageSquare,
    Eye,
    RefreshCcw,
    AlertCircle,
    CalendarIcon,
    LayoutGrid
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"

// Types for API Response
// Helper: get current date in EST
function getESTDate() {
    const estStr = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    return new Date(estStr)
}

interface KPIData {
    all: {
        summary: {
            totalSpend: string
            totalImpressions: number
            totalClicks: number
            totalRevenue: string
            roas: string | number
            ctr: string | number
            cpc: string | number
            emailSent: number
            emailOpens: number
            emailOpenRate: string | number
            emailClickRate: string | number
        }
    }
    email: {
        connected: boolean
        summary: {
            totalSent: number
            totalOpens: number
            totalClicks: number
            totalBounces: number
            totalUnsubs: number
            totalRevenue: number
            totalOrders: number
            openRate: string
            clickRate: string
            conversionRate: string
        }
        campaigns: Array<{
            id: string
            name: string
            sendDate: string
            sent: number
            revenue: number
        }>
    }
    facebook: {
        connected: boolean
        summary: {
            totalSpend: number
            totalImpressions: number
            totalClicks: number
            totalReach: number
            totalRevenue: string
            ctr: string
            cpc: string
            roas: string
        }
        campaigns: Array<{
            id: string
            name: string
            spend: string
            revenue: string
            roas: string
        }>
    }
    googleAds: {
        connected: boolean
        summary: {
            totalSpend: number
            totalImpressions: number
            totalClicks: number
            totalConversions: number
            totalConversionValue: number
            ctr: string | number
            cpc: string | number
            roas: string | number
        }
        campaigns: Array<{
            id: string
            name: string
            status: string
            spend: string
            impressions: number
            clicks: number
        }>
    }
    fetchedAt: string
}

interface DetailData {
    id: string
    name: string
    platform: 'mailchimp' | 'facebook' | 'googleads'
    metrics: any
    timeseries?: any[]
}

function MetricBox({ label, value, color = "text-foreground" }: { label: string, value: string | number, color?: string }) {
    return (
        <div className="text-center p-4 bg-muted rounded-lg border border-border/50 min-w-0 overflow-hidden">
            <p className={`text-xl font-bold ${color} truncate`}>
                {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
            </p>
            <p className="text-sm text-muted-foreground truncate">{label}</p>
        </div>
    )
}

function MetricRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex justify-between py-3 border-b border-border/50 last:border-0 hover:bg-muted/50 px-2 rounded-sm transition-colors">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    )
}

function CampaignDetailDialog({
    open,
    onOpenChange,
    campaignId,
    platform,
    initialStartDate,
    initialEndDate
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    campaignId: string | null
    platform: 'mailchimp' | 'facebook' | 'googleads'
    initialStartDate?: Date
    initialEndDate?: Date
}) {
    const [data, setData] = useState<DetailData | null>(null)
    const [loading, setLoading] = useState(false)
    const [detailDateRange, setDetailDateRange] = useState<DateRange | undefined>(undefined)
    const [detailDatePopoverOpen, setDetailDatePopoverOpen] = useState(false)
    const [detailSelectingDate, setDetailSelectingDate] = useState<'from' | 'to'>('from')

    // Fetch detail data
    const fetchDetail = useCallback(async (start?: Date, end?: Date) => {
        if (!campaignId) return
        setLoading(true)
        try {
            const body: any = { platform, campaignId }
            if (start && end) {
                body.startDate = format(start, 'yyyy-MM-dd')
                body.endDate = format(end, 'yyyy-MM-dd')
            }
            const res = await fetch('/api/kpi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const json = await res.json()
            setData(json)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [platform, campaignId])

    // Sync initial dates and fetch when dialog opens
    useEffect(() => {
        if (open && campaignId) {
            const startDate = initialStartDate
            const endDate = initialEndDate
            setDetailDateRange({ from: startDate, to: endDate })
            fetchDetail(startDate, endDate)
        } else {
            setData(null)
        }
    }, [open, campaignId, initialStartDate, initialEndDate, fetchDetail])

    // Handle date change inside detail dialog
    const handleDetailDateSelect = useCallback((date: Date | undefined) => {
        if (!date) return
        setDetailDateRange(prev => {
            let newFrom = prev?.from
            let newTo = prev?.to
            if (detailSelectingDate === 'from') {
                newFrom = date
                if (newTo && date > newTo) newTo = undefined
                setDetailSelectingDate('to')
            } else {
                newTo = date
                if (newFrom && date < newFrom) newFrom = undefined
            }
            const newRange = { from: newFrom, to: newTo }
            if (newRange.from && newRange.to) {
                fetchDetail(newRange.from, newRange.to)
            }
            return newRange
        })
    }, [detailSelectingDate, fetchDetail])

    const handleDetailQuickRange = useCallback((preset: string) => {
        const today = getESTDate()
        let start = new Date(today)
        switch (preset) {
            case '24h': start.setDate(today.getDate() - 1); break
            case '3d': start.setDate(today.getDate() - 3); break
            case '7d': start.setDate(today.getDate() - 7); break
            case '14d': start.setDate(today.getDate() - 14); break
            case '30d': start.setDate(today.getDate() - 30); break
            default: start.setDate(today.getDate() - 7)
        }
        setDetailDateRange({ from: start, to: today })
        setDetailDatePopoverOpen(false)
        fetchDetail(start, today)
    }, [fetchDetail])

    const renderMetrics = () => {
        if (!data?.metrics) return null;

        // Mailchimp Metrics
        if (platform === 'mailchimp') {
            return (
                <div className="space-y-4">
                    {/* Primary KPIs - 2 cols */}
                    <div className="grid grid-cols-2 gap-3">
                        <MetricBox label="Emails Sent" value={data.metrics.sent?.toLocaleString() || 0} />
                        <MetricBox label="Opens" value={data.metrics.opens?.toLocaleString() || 0} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <MetricBox label="Clicks" value={data.metrics.clicks?.toLocaleString() || 0} />
                        <MetricBox label="Open Rate" value={`${data.metrics.openRate}%`} color="text-green-600" />
                    </div>
                    {/* Revenue highlight */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-lg border border-green-200/50">
                            <p className="text-2xl font-bold text-green-600">${(data.metrics.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="text-sm text-muted-foreground">Revenue</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-lg border border-blue-200/50">
                            <p className="text-2xl font-bold text-blue-600">{data.metrics.orders || 0}</p>
                            <p className="text-sm text-muted-foreground">Orders</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <MetricBox label="Click Rate" value={`${data.metrics.clickRate}%`} color="text-blue-600" />
                        <MetricBox label="Unsubs" value={data.metrics.unsubscribes || 0} />
                    </div>
                </div>
            )
        }

        // Facebook Metrics
        if (platform === 'facebook') {
            return (
                <div className="space-y-4">
                    {/* Spend & Revenue - stacked */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-4 bg-gradient-to-br from-red-500/10 to-orange-500/5 rounded-xl border border-red-200/50">
                            <p className="text-2xl font-bold text-red-600">${parseFloat(data.metrics.spend || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="text-sm text-muted-foreground mt-1">Ad Spend</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl border border-green-200/50">
                            <p className="text-2xl font-bold text-green-600">${parseFloat(data.metrics.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="text-sm text-muted-foreground mt-1">Revenue</p>
                        </div>
                    </div>
                    {/* ROAS Highlight */}
                    <div className="text-center p-4 bg-gradient-to-r from-purple-500/10 via-violet-500/10 to-purple-500/10 rounded-xl border border-purple-200/50">
                        <p className="text-3xl font-bold text-purple-600">{parseFloat(data.metrics.roas || 0).toFixed(2)}x</p>
                        <p className="text-sm text-muted-foreground mt-1">Return on Ad Spend (ROAS)</p>
                    </div>
                    {/* Other Metrics - 2 per row */}
                    <div className="grid grid-cols-2 gap-3">
                        <MetricBox label="Impressions" value={parseInt(data.metrics.impressions || 0).toLocaleString()} />
                        <MetricBox label="Reach" value={parseInt(data.metrics.reach || 0).toLocaleString()} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <MetricBox label="Clicks" value={parseInt(data.metrics.clicks || 0).toLocaleString()} />
                        <MetricBox label="CTR" value={`${parseFloat(data.metrics.ctr || 0).toFixed(2)}%`} color="text-purple-600" />
                    </div>
                </div>
            )
        }

        // Google Ads Metrics
        return (
            <div className="space-y-4">
                {/* Spend & Conversions - stacked */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl border border-blue-200/50">
                        <p className="text-2xl font-bold text-blue-600">${parseFloat(data.metrics.spend || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-sm text-muted-foreground mt-1">Ad Spend</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl border border-green-200/50">
                        <p className="text-2xl font-bold text-green-600">{Number(data.metrics.conversions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        <p className="text-sm text-muted-foreground mt-1">Conversions</p>
                        <p className="text-xs text-muted-foreground">${parseFloat(data.metrics.conversionValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} value</p>
                    </div>
                </div>
                {/* Performance Metrics - 2 per row */}
                <div className="grid grid-cols-2 gap-3">
                    <MetricBox label="Impressions" value={parseInt(data.metrics.impressions || 0).toLocaleString()} />
                    <MetricBox label="Clicks" value={parseInt(data.metrics.clicks || 0).toLocaleString()} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <MetricBox label="CTR" value={`${parseFloat(data.metrics.ctr || 0).toFixed(2)}%`} color="text-blue-600" />
                    <MetricBox label="CPC" value={`$${parseFloat(data.metrics.cpc || 0).toFixed(2)}`} color="text-orange-600" />
                </div>
                {/* Daily Breakdown Table */}
                {data.timeseries && data.timeseries.length > 0 && (
                    <div className="mt-2">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2">Daily Breakdown</h4>
                        <ScrollArea className="h-[220px] rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                                    <tr className="border-b">
                                        <th className="text-left p-2 font-medium">Date</th>
                                        <th className="text-right p-2 font-medium">Spend</th>
                                        <th className="text-right p-2 font-medium">Impr.</th>
                                        <th className="text-right p-2 font-medium">Clicks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.timeseries.map((row: any, i: number) => (
                                        <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                            <td className="p-2 font-mono text-xs">{row.date}</td>
                                            <td className="p-2 text-right font-medium">${parseFloat(row.spend || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="p-2 text-right">{parseInt(row.impressions || 0).toLocaleString()}</td>
                                            <td className="p-2 text-right">{parseInt(row.clicks || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </ScrollArea>
                    </div>
                )}
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden border shadow-lg bg-background sm:rounded-xl">
                <div className="bg-muted/30 p-6 border-b">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold tracking-tight">
                            {data?.name || 'Loading...'}
                        </DialogTitle>
                        <DialogDescription className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            {platform === 'mailchimp' ? <Mail className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {platform === 'mailchimp' ? 'Email Campaign Report' : platform === 'facebook' ? 'Facebook Ad Insights' : 'Google Ads Campaign'}
                        </DialogDescription>
                    </DialogHeader>
                    {/* Date picker for Facebook / Google Ads */}
                    {platform !== 'mailchimp' ? (
                        <div className="mt-3 flex items-center gap-2">
                            <Popover open={detailDatePopoverOpen} onOpenChange={setDetailDatePopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2 text-xs font-normal">
                                        <CalendarIcon className="h-3 w-3" />
                                        {detailDateRange?.from && detailDateRange?.to
                                            ? `${format(detailDateRange.from, 'MMM d')} – ${format(detailDateRange.to, 'MMM d, yyyy')}`
                                            : 'Select dates'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <div className="flex gap-2 px-4 pt-3 pb-1">
                                        <Button
                                            variant={detailSelectingDate === 'from' ? 'default' : 'outline'}
                                            size="sm"
                                            className="flex-1 text-xs h-8"
                                            onClick={() => setDetailSelectingDate('from')}
                                        >
                                            From: {detailDateRange?.from ? format(detailDateRange.from, 'MMM d') : '—'}
                                        </Button>
                                        <Button
                                            variant={detailSelectingDate === 'to' ? 'default' : 'outline'}
                                            size="sm"
                                            className="flex-1 text-xs h-8"
                                            onClick={() => setDetailSelectingDate('to')}
                                        >
                                            To: {detailDateRange?.to ? format(detailDateRange.to, 'MMM d') : '—'}
                                        </Button>
                                    </div>
                                    <Calendar
                                        mode="single"
                                        selected={detailSelectingDate === 'from' ? detailDateRange?.from : detailDateRange?.to}
                                        onSelect={handleDetailDateSelect}
                                        numberOfMonths={1}
                                        disabled={(date) => date > getESTDate()}
                                        modifiers={{
                                            range_middle: (date) => {
                                                if (!detailDateRange?.from || !detailDateRange?.to) return false
                                                return date > detailDateRange.from && date < detailDateRange.to
                                            },
                                            range_start: detailDateRange?.from ? [detailDateRange.from] : [],
                                            range_end: detailDateRange?.to ? [detailDateRange.to] : [],
                                        }}
                                        modifiersStyles={{
                                            range_middle: { backgroundColor: 'hsl(var(--primary) / 0.1)', borderRadius: 0 },
                                            range_start: { backgroundColor: 'hsl(var(--primary))', color: 'white', borderRadius: '50%' },
                                            range_end: { backgroundColor: 'hsl(var(--primary))', color: 'white', borderRadius: '50%' },
                                        }}
                                    />
                                    <div className="border-t border-border/50 p-3">
                                        <Select onValueChange={handleDetailQuickRange}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Quick Time Range" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="24h">Last 24 hours</SelectItem>
                                                <SelectItem value="3d">Last 3 days</SelectItem>
                                                <SelectItem value="7d">Last 7 days</SelectItem>
                                                <SelectItem value="14d">Last 2 weeks</SelectItem>
                                                <SelectItem value="30d">Last month</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground mt-2 italic">Showing lifetime campaign stats</p>
                    )}
                </div>

                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3">
                        <RefreshCcw className="h-6 w-6 animate-spin text-muted-foreground" />
                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Loading Data</p>
                    </div>
                ) : data ? (
                    <ScrollArea className="max-h-[65vh]">
                        <div className="p-6 space-y-8">
                            {/* Detailed Metrics Grid */}
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 border-l-2 border-primary pl-2">
                                    Key Metrics
                                </h4>
                                {renderMetrics()}
                            </div>

                            {/* Timeseries Table */}
                            {data.timeseries && data.timeseries.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 border-l-2 border-primary pl-2">
                                        24-Hour Performance
                                    </h4>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50 text-xs text-muted-foreground font-medium uppercase">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-semibold">Time</th>
                                                    <th className="px-4 py-3 text-right font-semibold">Opens</th>
                                                    <th className="px-4 py-3 text-right font-semibold">Clicks</th>
                                                    <th className="px-4 py-3 text-right font-semibold">Sent</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/50">
                                                {data.timeseries.slice(0, 12).map((t: any, i: number) => (
                                                    <tr key={i} className="group hover:bg-muted/30 transition-colors">
                                                        <td className="px-4 py-2.5 font-medium text-foreground/80 whitespace-nowrap">
                                                            {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-mono text-muted-foreground group-hover:text-foreground">
                                                            {t.unique_opens > 0 ? t.unique_opens.toLocaleString() : '-'}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-mono text-muted-foreground group-hover:text-foreground">
                                                            {t.recipients_clicks > 0 ? t.recipients_clicks.toLocaleString() : '-'}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-mono text-muted-foreground text-xs">
                                                            {t.emails_sent > 0 ? t.emails_sent.toLocaleString() : ''}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="p-12 text-center text-muted-foreground">
                        <p>Unable to load detail data.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

function CampaignList({ campaigns, type, onSelect }: { campaigns: any[], type: 'email' | 'ad', onSelect: (id: string) => void }) {
    if (!campaigns?.length) return <div className="text-muted-foreground text-sm p-8 text-center bg-muted/20 rounded-xl border border-dashed">No recent activity</div>

    return (
        <ScrollArea className="h-[420px]">
            <div className="space-y-1 mt-2 pr-4">
                {campaigns.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => onSelect(c.id)}
                        className="group w-full flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-all duration-200 text-left border border-transparent hover:border-border/40"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-1.5 h-1.5 rounded-full ${type === 'email' ? 'bg-blue-500' : 'bg-purple-500'} flex-shrink-0`}></div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-medium text-sm truncate group-hover:text-primary transition-colors pr-2">
                                    {c.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                    {c.sendDate ? new Date(c.sendDate).toLocaleDateString() : 'ID: ' + c.id}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                            {type === 'email' ? (
                                <>
                                    <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded whitespace-nowrap">
                                        {(c.sent || 0).toLocaleString()} sent
                                    </span>
                                    {c.revenue > 0 && (
                                        <span className="text-xs font-mono text-green-600 bg-green-500/10 px-2 py-0.5 rounded whitespace-nowrap">
                                            ${c.revenue.toFixed(2)}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded whitespace-nowrap">
                                        ${Number(c.spend || 0).toFixed(2)}
                                    </span>
                                    {parseFloat(c.roas) > 0 && (
                                        <span className="text-xs font-mono text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded whitespace-nowrap">
                                            {c.roas}x
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </ScrollArea>
    )
}

export function AnalyticsDashboard() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const [data, setData] = useState<KPIData | null>(null)
    const [loading, setLoading] = useState(true)
    const [initialLoading, setInitialLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Detail View State
    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [selectedPlatform, setSelectedPlatform] = useState<'mailchimp' | 'facebook' | 'googleads'>('mailchimp')

    // Date picker popover state
    const [datePopoverOpen, setDatePopoverOpen] = useState(false)
    const [selectingDate, setSelectingDate] = useState<'from' | 'to'>('from')

    // Read initial state from URL params
    const activeTab = searchParams.get('tab') || 'all'
    const urlStart = searchParams.get('start')
    const urlEnd = searchParams.get('end')

    // Compute default dates in EST
    const getDefaultDates = useCallback((): { start: Date; end: Date } => {
        const today = getESTDate()
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(today.getDate() - 7)
        return { start: sevenDaysAgo, end: today }
    }, [])

    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        if (urlStart && urlEnd) {
            return { from: new Date(urlStart), to: new Date(urlEnd) }
        }
        const { start, end } = getDefaultDates()
        return { from: start, to: end }
    })

    const openDetail = (id: string, platform: 'mailchimp' | 'facebook' | 'googleads') => {
        setSelectedId(id)
        setSelectedPlatform(platform)
        setDetailOpen(true)
    }

    // Update URL params without navigation
    const updateURL = useCallback((tab: string, start?: Date, end?: Date) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', tab)
        if (start && end) {
            params.set('start', format(start, 'yyyy-MM-dd'))
            params.set('end', format(end, 'yyyy-MM-dd'))
        }
        router.replace(`?${params.toString()}`, { scroll: false })
    }, [searchParams, router])

    // Fetch all data in one API call
    const fetchData = useCallback(async (start: Date, end: Date) => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams({
                startDate: format(start, 'yyyy-MM-dd'),
                endDate: format(end, 'yyyy-MM-dd')
            })
            const res = await fetch(`/api/kpi?${params.toString()}`)
            if (!res.ok) throw new Error('Failed to fetch data')
            const json = await res.json()
            setData({ ...json, fetchedAt: json.fetchedAt || new Date().toISOString() })
            setInitialLoading(false)
        } catch (err) {
            console.error(err)
            setError('Failed to load KPI data. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [])

    // Handle tab change
    const handleTabChange = useCallback((tab: string) => {
        updateURL(tab, dateRange?.from, dateRange?.to)
    }, [updateURL, dateRange])

    // Handle single date selection for From/To
    const handleSingleDateSelect = useCallback((date: Date | undefined) => {
        if (!date) return
        setDateRange(prev => {
            let newFrom = prev?.from
            let newTo = prev?.to
            if (selectingDate === 'from') {
                newFrom = date
                // If new from > current to, reset to
                if (newTo && date > newTo) newTo = undefined
                // Auto-switch to "to" selection
                setSelectingDate('to')
            } else {
                newTo = date
                // If new to < current from, reset from
                if (newFrom && date < newFrom) newFrom = undefined
            }
            const newRange = { from: newFrom, to: newTo }
            if (newRange.from && newRange.to) {
                updateURL(activeTab, newRange.from, newRange.to)
                fetchData(newRange.from, newRange.to)
            }
            return newRange
        })
    }, [selectingDate, activeTab, updateURL, fetchData])

    // Quick time range presets
    const handleQuickRange = useCallback((preset: string) => {
        const today = getESTDate()
        let start = new Date(today)
        switch (preset) {
            case '24h': start.setDate(today.getDate() - 1); break
            case '3d': start.setDate(today.getDate() - 3); break
            case '7d': start.setDate(today.getDate() - 7); break
            case '14d': start.setDate(today.getDate() - 14); break
            case '30d': start.setDate(today.getDate() - 30); break
            default: start.setDate(today.getDate() - 7)
        }
        const newRange: DateRange = { from: start, to: today }
        setDateRange(newRange)
        updateURL(activeTab, start, today)
        fetchData(start, today)
        setDatePopoverOpen(false)
    }, [activeTab, updateURL, fetchData])

    const refreshData = useCallback(() => {
        if (dateRange?.from && dateRange?.to) {
            fetchData(dateRange.from, dateRange.to)
        }
    }, [dateRange, fetchData])

    useEffect(() => {
        const start = urlStart ? new Date(urlStart) : getDefaultDates().start
        const end = urlEnd ? new Date(urlEnd) : getDefaultDates().end
        if (!urlStart || !urlEnd) {
            updateURL(activeTab, start, end)
        }
        fetchData(start, end)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (initialLoading) {
        return (
            <div className="h-[50vh] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
                <RefreshCcw className="h-12 w-12 animate-spin text-primary/20" />
                <p className="text-muted-foreground font-medium animate-pulse">Syncing dashboard metrics...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-[50vh] flex flex-col items-center justify-center space-y-6">
                <div className="bg-destructive/10 p-6 rounded-full">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
                <div className="text-center space-y-2">
                    <p className="text-lg font-semibold text-foreground">{error}</p>
                    <p className="text-muted-foreground">Check your connection and try again.</p>
                </div>
                <Button onClick={() => refreshData()} className="px-8">Retry Sync</Button>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 slide-in-from-bottom-4 relative">
            {/* Inline loading overlay for refetches */}
            {loading && !initialLoading && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-xl">
                    <div className="flex items-center gap-2 bg-background/90 px-4 py-2 rounded-lg border shadow-sm">
                        <RefreshCcw className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Updating...</span>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics Dashboard</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Real-time performance metrics
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            Last active: {data?.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString() : 'Just now'}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-2 mr-4">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${data?.email?.connected ? 'bg-green-500/10 text-green-700 border-green-200' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${data?.email?.connected ? 'bg-green-600' : 'bg-destructive'}`}></div>
                            Mailchimp
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${data?.facebook?.connected ? 'bg-green-500/10 text-green-700 border-green-200' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${data?.facebook?.connected ? 'bg-green-600' : 'bg-destructive'}`}></div>
                            Facebook
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${data?.googleAds?.connected ? 'bg-green-500/10 text-green-700 border-green-200' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${data?.googleAds?.connected ? 'bg-green-600' : 'bg-destructive'}`}></div>
                            Google Ads
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refreshData()} className="gap-2 shadow-sm hover:shadow active:scale-95 transition-all">
                        <RefreshCcw className="h-4 w-4" />
                        Refresh Data
                    </Button>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} className="space-y-8" onValueChange={handleTabChange}>
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 flex flex-col sm:flex-row sm:items-center gap-3">
                    <TabsList className="bg-muted/30 border border-border/50 p-1 h-12 w-full md:w-auto inline-flex rounded-xl">
                        <TabsTrigger value="all" className="gap-2 px-6 h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all focus-visible:ring-0">
                            <LayoutGrid className="h-4 w-4" />
                            <span className="font-medium">All</span>
                        </TabsTrigger>
                        <TabsTrigger value="email" className="gap-2 px-6 h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all focus-visible:ring-0">
                            <Mail className="h-4 w-4" />
                            <span className="font-medium">Email</span>
                        </TabsTrigger>
                        <TabsTrigger value="sms" className="gap-2 px-6 h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all focus-visible:ring-0">
                            <MessageSquare className="h-4 w-4" />
                            <span className="font-medium">SMS</span>
                        </TabsTrigger>
                        <TabsTrigger value="facebook" className="gap-2 px-6 h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all focus-visible:ring-0">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">Facebook</span>
                        </TabsTrigger>
                        <TabsTrigger value="google" className="gap-2 px-6 h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all focus-visible:ring-0">
                            <Eye className="h-4 w-4" />
                            <span className="font-medium">Google Ads</span>
                        </TabsTrigger>
                    </TabsList>
                    <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 min-w-[240px] justify-start font-normal sm:ml-auto">
                                <CalendarIcon className="h-3.5 w-3.5" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>{format(dateRange.from, 'MMM d, yyyy')} – {format(dateRange.to, 'MMM d, yyyy')}</>
                                    ) : (
                                        format(dateRange.from, 'MMM d, yyyy')
                                    )
                                ) : (
                                    'Select date range'
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <div className="flex gap-2 px-4 pt-3 pb-1">
                                <Button
                                    variant={selectingDate === 'from' ? 'default' : 'outline'}
                                    size="sm"
                                    className="flex-1 text-xs h-8"
                                    onClick={() => setSelectingDate('from')}
                                >
                                    From: {dateRange?.from ? format(dateRange.from, 'MMM d') : '—'}
                                </Button>
                                <Button
                                    variant={selectingDate === 'to' ? 'default' : 'outline'}
                                    size="sm"
                                    className="flex-1 text-xs h-8"
                                    onClick={() => setSelectingDate('to')}
                                >
                                    To: {dateRange?.to ? format(dateRange.to, 'MMM d') : '—'}
                                </Button>
                            </div>
                            <Calendar
                                mode="single"
                                selected={selectingDate === 'from' ? dateRange?.from : dateRange?.to}
                                onSelect={handleSingleDateSelect}
                                numberOfMonths={1}
                                disabled={(date) => date > getESTDate()}
                                initialFocus
                                modifiers={{
                                    range_middle: (date) => {
                                        if (!dateRange?.from || !dateRange?.to) return false
                                        return date > dateRange.from && date < dateRange.to
                                    },
                                    range_start: dateRange?.from ? [dateRange.from] : [],
                                    range_end: dateRange?.to ? [dateRange.to] : [],
                                }}
                                modifiersStyles={{
                                    range_middle: { backgroundColor: 'hsl(var(--primary) / 0.1)', borderRadius: 0 },
                                    range_start: { backgroundColor: 'hsl(var(--primary))', color: 'white', borderRadius: '50%' },
                                    range_end: { backgroundColor: 'hsl(var(--primary))', color: 'white', borderRadius: '50%' },
                                }}
                            />
                            <div className="border-t border-border/50 p-3">
                                <Select onValueChange={handleQuickRange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Quick Time Range" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="24h">Last 24 hours</SelectItem>
                                        <SelectItem value="3d">Last 3 days</SelectItem>
                                        <SelectItem value="7d">Last 7 days</SelectItem>
                                        <SelectItem value="14d">Last 2 weeks</SelectItem>
                                        <SelectItem value="30d">Last month</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* ALL TAB */}
                <TabsContent value="all" className="space-y-8">
                    {/* Spend / Revenue / ROAS */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="p-6 bg-gradient-to-br from-red-500/10 to-orange-500/5 rounded-xl border border-red-200/50">
                            <p className="text-sm text-muted-foreground mb-1">Total Ad Spend</p>
                            <p className="text-3xl font-bold text-red-600">${parseFloat(data?.all?.summary?.totalSpend || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl border border-green-200/50">
                            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                            <p className="text-3xl font-bold text-green-600">${parseFloat(data?.all?.summary?.totalRevenue || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-6 bg-gradient-to-br from-purple-500/10 to-violet-500/5 rounded-xl border border-purple-200/50">
                            <p className="text-sm text-muted-foreground mb-1">ROAS</p>
                            <p className="text-3xl font-bold text-purple-600">{data?.all?.summary?.roas || '0.00'}x</p>
                            <p className="text-xs text-muted-foreground mt-2">Return on Ad Spend</p>
                        </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <MetricBox label="Total Impressions" value={data?.all?.summary?.totalImpressions?.toLocaleString() || 0} />
                        <MetricBox label="Total Clicks" value={data?.all?.summary?.totalClicks?.toLocaleString() || 0} />
                        <MetricBox label="Avg. CTR" value={`${data?.all?.summary?.ctr || 0}%`} color="text-purple-600" />
                        <MetricBox label="Avg. CPC" value={`$${data?.all?.summary?.cpc || '0.00'}`} color="text-orange-600" />
                    </div>

                    {/* Email Metrics */}
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                Email Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                                <MetricBox label="Emails Sent" value={data?.all?.summary?.emailSent?.toLocaleString() || 0} />
                                <MetricBox label="Opens" value={data?.all?.summary?.emailOpens?.toLocaleString() || 0} />
                                <MetricBox label="Open Rate" value={`${data?.all?.summary?.emailOpenRate || '0.00'}%`} color="text-green-600" />
                                <MetricBox label="Click Rate" value={`${data?.all?.summary?.emailClickRate || '0.00'}%`} color="text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* EMAIL TAB */}
                <TabsContent value="email" className="space-y-8">
                    {/* Revenue Highlight */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl border border-green-200/50">
                            <p className="text-sm text-muted-foreground mb-1">Email Revenue</p>
                            <p className="text-3xl font-bold text-green-600">${(data?.email.summary.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            <p className="text-xs text-muted-foreground mt-2">{data?.email.summary.totalOrders || 0} orders</p>
                        </div>
                        <div className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl border border-blue-200/50">
                            <p className="text-sm text-muted-foreground mb-1">Conversion Rate</p>
                            <p className="text-3xl font-bold text-blue-600">{data?.email.summary.conversionRate || '0.00'}%</p>
                            <p className="text-xs text-muted-foreground mt-2">Orders / Clicks</p>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <MetricBox label="Total Emails Sent" value={data?.email.summary.totalSent || 0} />
                        <MetricBox label="Overall Open Rate" value={`${data?.email.summary.openRate || 0}%`} color="text-green-600" />
                        <MetricBox label="Overall Click Rate" value={`${data?.email.summary.clickRate || 0}%`} color="text-blue-600" />
                        <MetricBox label="Total Unsubscribes" value={data?.email.summary.totalUnsubs || 0} />
                    </div>

                    <div className="grid gap-8 md:grid-cols-3">
                        <Card className="md:col-span-2 border-border/50 shadow-sm">
                            <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            Recent Campaigns
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground">Select a campaign to view detailed analytics</p>
                                    </div>
                                    <Badge variant="outline" className="bg-background">
                                        {data?.email.campaigns.length} Campaigns
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <CampaignList
                                    campaigns={data?.email.campaigns || []}
                                    type="email"
                                    onSelect={(id) => openDetail(id, 'mailchimp')}
                                />
                            </CardContent>
                        </Card>

                        <Card className="border-border/50 shadow-sm h-fit">
                            <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
                                <CardTitle className="text-lg font-semibold">Engagement Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <MetricRow label="Total Opens" value={data?.email.summary.totalOpens?.toLocaleString() || "0"} />
                                <MetricRow label="Total Clicks" value={data?.email.summary.totalClicks?.toLocaleString() || "0"} />
                                <MetricRow label="Total Bounces" value={data?.email.summary.totalBounces?.toLocaleString() || "0"} />
                                <MetricRow label="Total Orders" value={data?.email.summary.totalOrders?.toLocaleString() || "0"} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* FACEBOOK TAB */}
                <TabsContent value="facebook" className="space-y-8">
                    {/* Revenue & ROAS Highlight */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="p-6 bg-gradient-to-br from-red-500/10 to-orange-500/5 rounded-xl border border-red-200/50">
                            <p className="text-sm text-muted-foreground mb-1">Ad Spend</p>
                            <p className="text-3xl font-bold text-red-600">${data?.facebook.summary.totalSpend?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</p>
                        </div>
                        <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl border border-green-200/50">
                            <p className="text-sm text-muted-foreground mb-1">Revenue</p>
                            <p className="text-3xl font-bold text-green-600">${parseFloat(data?.facebook.summary.totalRevenue || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="p-6 bg-gradient-to-br from-purple-500/10 to-violet-500/5 rounded-xl border border-purple-200/50">
                            <p className="text-sm text-muted-foreground mb-1">ROAS</p>
                            <p className="text-3xl font-bold text-purple-600">{data?.facebook.summary.roas || '0.00'}x</p>
                            <p className="text-xs text-muted-foreground mt-2">Return on Ad Spend</p>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <MetricBox label="Total Impressions" value={data?.facebook.summary.totalImpressions?.toLocaleString() || 0} />
                        <MetricBox label="Total Reach" value={data?.facebook.summary.totalReach?.toLocaleString() || 0} />
                        <MetricBox label="Avg. CTR" value={`${data?.facebook.summary.ctr || 0}%`} color="text-purple-600" />
                        <MetricBox label="Avg. CPC" value={`$${data?.facebook.summary.cpc || '0.00'}`} color="text-orange-600" />
                    </div>

                    <div className="grid gap-8 md:grid-cols-3">
                        <Card className="md:col-span-2 border-border/50 shadow-sm">
                            <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
                                <CardTitle className="text-lg font-semibold">Active Campaigns</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <CampaignList
                                    campaigns={data?.facebook.campaigns || []}
                                    type="ad"
                                    onSelect={(id) => openDetail(id, 'facebook')}
                                />
                            </CardContent>
                        </Card>

                        <Card className="border-border/50 shadow-sm h-fit">
                            <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
                                <CardTitle className="text-lg font-semibold">Campaign Performance</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <MetricRow label="Total Clicks" value={data?.facebook.summary.totalClicks?.toLocaleString() || "0"} />
                                <MetricRow label="Avg. CPC" value={`$${data?.facebook.summary.cpc || '0.00'}`} />
                                <MetricRow label="Avg. CTR" value={`${data?.facebook.summary.ctr || '0'}%`} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* PLACEHOLDER TABS */}
                <TabsContent value="sms" className="flex flex-col items-center justify-center min-h-[400px]">
                    <div className="text-center space-y-4 max-w-md p-8 rounded-2xl bg-muted/30 border border-dashed border-border/50">
                        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <MessageSquare className="h-8 w-8 text-primary/60" />
                        </div>
                        <h3 className="text-lg font-bold">SMS Marketing</h3>
                        <p className="text-muted-foreground">Attentive is connected but reporting data is not yet flowing. Check back soon for SMS performance.</p>
                        <Button variant="outline">Check Connection</Button>
                    </div>
                </TabsContent>

                {/* GOOGLE ADS TAB */}
                <TabsContent value="google" className="space-y-8">
                    {data?.googleAds?.connected ? (
                        <>
                            {/* Spend & Performance Highlight */}
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl border border-blue-200/50">
                                    <p className="text-sm text-muted-foreground mb-1">Ad Spend</p>
                                    <p className="text-3xl font-bold text-blue-600">${data?.googleAds.summary.totalSpend?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</p>
                                </div>
                                <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl border border-green-200/50">
                                    <p className="text-sm text-muted-foreground mb-1">Conversions</p>
                                    <p className="text-3xl font-bold text-green-600">{Number(data?.googleAds.summary.totalConversions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                    <p className="text-xs text-muted-foreground mt-2">${data?.googleAds.summary.totalConversionValue?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'} value</p>
                                </div>
                                <div className="p-6 bg-gradient-to-br from-orange-500/10 to-amber-500/5 rounded-xl border border-orange-200/50">
                                    <p className="text-sm text-muted-foreground mb-1">ROAS</p>
                                    <p className="text-3xl font-bold text-orange-600">{data?.googleAds.summary.roas || '0.00'}x</p>
                                    <p className="text-xs text-muted-foreground mt-2">Return on Ad Spend</p>
                                </div>
                            </div>

                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                                <MetricBox label="Total Impressions" value={data?.googleAds.summary.totalImpressions?.toLocaleString() || 0} />
                                <MetricBox label="Total Clicks" value={data?.googleAds.summary.totalClicks?.toLocaleString() || 0} />
                                <MetricBox label="Avg. CTR" value={`${data?.googleAds.summary.ctr || 0}%`} color="text-blue-600" />
                                <MetricBox label="Avg. CPC" value={`$${data?.googleAds.summary.cpc || '0.00'}`} color="text-orange-600" />
                            </div>

                            <div className="grid gap-8 md:grid-cols-3">
                                <Card className="md:col-span-2 border-border/50 shadow-sm">
                                    <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg font-semibold">Google Ads Campaigns</CardTitle>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                                                    {data?.googleAds.campaigns?.filter(c => c.status === 'ENABLED').length || 0} Active
                                                </Badge>
                                                <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-200">
                                                    {data?.googleAds.campaigns?.filter(c => c.status !== 'ENABLED').length || 0} Paused
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        {data?.googleAds.campaigns?.length ? (
                                            <ScrollArea className="h-[420px]">
                                                <div className="pr-4 space-y-4">
                                                    {/* Active Campaigns Section */}
                                                    {data.googleAds.campaigns.filter(c => c.status === 'ENABLED').length > 0 && (
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-2 px-2">
                                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                                <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Active Campaigns</span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                {data.googleAds.campaigns.filter(c => c.status === 'ENABLED').map((c, idx) => (
                                                                    <button
                                                                        key={`${c.id}_${idx}`}
                                                                        onClick={() => openDetail(c.id, 'googleads')}
                                                                        className="group w-full flex items-center justify-between p-3 hover:bg-green-500/5 rounded-lg transition-all duration-200 text-left border border-transparent hover:border-green-200/50"
                                                                    >
                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                                                                            <div className="flex flex-col min-w-0">
                                                                                <span className="font-medium text-sm truncate group-hover:text-green-600 transition-colors pr-2">
                                                                                    {c.name}
                                                                                </span>
                                                                                <span className="text-[11px] text-muted-foreground">
                                                                                    {c.impressions?.toLocaleString() || 0} impressions • {c.clicks?.toLocaleString() || 0} clicks
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 ml-2">
                                                                            <span className="text-xs font-semibold text-green-600 bg-green-500/10 px-2.5 py-1 rounded-md whitespace-nowrap">
                                                                                ${c.spend}
                                                                            </span>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Paused Campaigns Section */}
                                                    {data.googleAds.campaigns.filter(c => c.status !== 'ENABLED').length > 0 && (
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-2 px-2 pt-2 border-t border-border/30">
                                                                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paused Campaigns</span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                {data.googleAds.campaigns.filter(c => c.status !== 'ENABLED').map((c, idx) => (
                                                                    <button
                                                                        key={`${c.id}_${idx}`}
                                                                        onClick={() => openDetail(c.id, 'googleads')}
                                                                        className="group w-full flex items-center justify-between p-3 hover:bg-muted/30 rounded-lg transition-all duration-200 text-left border border-transparent hover:border-border/30 opacity-70 hover:opacity-100"
                                                                    >
                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                            <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0"></div>
                                                                            <div className="flex flex-col min-w-0">
                                                                                <span className="font-medium text-sm truncate group-hover:text-foreground transition-colors pr-2 text-muted-foreground">
                                                                                    {c.name}
                                                                                </span>
                                                                                <span className="text-[11px] text-muted-foreground/70">
                                                                                    {c.impressions?.toLocaleString() || 0} impressions
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 ml-2">
                                                                            <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded whitespace-nowrap">
                                                                                ${c.spend}
                                                                            </span>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        ) : (
                                            <div className="text-muted-foreground text-sm p-8 text-center bg-muted/20 rounded-xl border border-dashed">No campaigns found</div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="border-border/50 shadow-sm h-fit">
                                    <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
                                        <CardTitle className="text-lg font-semibold">Performance</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                        <MetricRow label="Total Spend" value={`$${data?.googleAds.summary.totalSpend?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}`} />
                                        <MetricRow label="Conversions" value={Number(data?.googleAds.summary.totalConversions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} />
                                        <MetricRow label="Conv. Value" value={`$${data?.googleAds.summary.totalConversionValue?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}`} />
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center min-h-[400px]">
                            <div className="text-center space-y-4 max-w-md p-8 rounded-2xl bg-muted/30 border border-dashed border-border/50">
                                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <Eye className="h-8 w-8 text-primary/60" />
                                </div>
                                <h3 className="text-lg font-bold">Google Ads Analytics</h3>
                                <p className="text-muted-foreground">Google Ads data is not available. Check your API connection.</p>
                                <Button variant="outline" onClick={() => refreshData()}>Retry Connection</Button>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <CampaignDetailDialog
                open={detailOpen}
                onOpenChange={setDetailOpen}
                campaignId={selectedId}
                platform={selectedPlatform}
                initialStartDate={dateRange?.from}
                initialEndDate={dateRange?.to}
            />
        </div>
    )
}
