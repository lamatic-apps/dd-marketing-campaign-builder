"use client"

import { useState, useEffect, useCallback } from "react"
import { Campaign, CampaignStatus, ActivityAction } from "@/lib/supabase"

interface UseCampaignsOptions {
    autoFetch?: boolean
    status?: CampaignStatus
}

interface UseCampaignsReturn {
    campaigns: Campaign[]
    loading: boolean
    error: string | null
    refetch: (silent?: boolean) => Promise<void>
    createCampaign: (data: CreateCampaignInput) => Promise<Campaign | null>
    updateCampaign: (id: string, data: Partial<Campaign>) => Promise<Campaign | null>
    deleteCampaign: (id: string) => Promise<boolean>
    updateStatus: (id: string, status: CampaignStatus) => Promise<Campaign | null>
    addCampaign: (campaign: Campaign) => void
}

export interface CreateCampaignInput {
    title: string
    topic: string
    scheduledDate?: string
    channels: Record<string, boolean>
    products?: Array<{ sku: string; name: string; price?: number }>
    contentFocus?: number
    notes?: string
    generatedContent?: Record<string, any>
    docUrl?: string
    folderUrl?: string
}

// Get user email from localStorage (pre-OAuth solution)
function getUserEmail(): string {
    if (typeof window === 'undefined') return 'system@diversdirect.com'
    return localStorage.getItem('user-email') || 'anonymous@diversdirect.com'
}

export function useCampaigns(options: UseCampaignsOptions = {}): UseCampaignsReturn {
    const { autoFetch = true, status } = options
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchCampaigns = useCallback(async (silent = false) => {
        if (!silent) {
            setLoading(true)
        }
        setError(null)

        try {
            const params = new URLSearchParams()
            if (status) params.set('status', status)
            // Add timestamp to prevent caching
            params.set('t', Date.now().toString())

            const res = await fetch(`/api/campaigns?${params.toString()}`, {
                cache: 'no-store',
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache'
                }
            })
            if (!res.ok) {
                throw new Error(`Failed to fetch campaigns: ${res.statusText}`)
            }

            const data = await res.json()
            setCampaigns(data.campaigns || [])
        } catch (err: any) {
            console.error('Error fetching campaigns:', err)
            setError(err.message)
        } finally {
            if (!silent) {
                setLoading(false)
            }
        }
    }, [status])

    useEffect(() => {
        if (autoFetch) {
            fetchCampaigns()
        }
    }, [autoFetch, fetchCampaigns])

    const createCampaign = useCallback(async (data: CreateCampaignInput): Promise<Campaign | null> => {
        try {
            const res = await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    userEmail: getUserEmail(),
                }),
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Failed to create campaign')
            }

            const { campaign } = await res.json()

            // Immediate UI update (Optimistic/Confirmed)
            setCampaigns(prev => {
                if (prev.some(c => c.id === campaign.id)) return prev
                return [campaign, ...prev]
            })

            return campaign
        } catch (err: any) {
            console.error('Error creating campaign:', err)
            setError(err.message)
            return null
        }
    }, [])

    const updateCampaign = useCallback(async (id: string, data: Partial<Campaign>): Promise<Campaign | null> => {
        try {
            const res = await fetch(`/api/campaigns/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    userEmail: getUserEmail(),
                }),
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Failed to update campaign')
            }

            const { campaign } = await res.json()
            setCampaigns(prev => prev.map(c => c.id === id ? campaign : c))
            return campaign
        } catch (err: any) {
            console.error('Error updating campaign:', err)
            setError(err.message)
            return null
        }
    }, [])

    const deleteCampaign = useCallback(async (id: string): Promise<boolean> => {
        try {
            const res = await fetch(`/api/campaigns/${id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Failed to delete campaign')
            }

            setCampaigns(prev => prev.filter(c => c.id !== id))
            return true
        } catch (err: any) {
            console.error('Error deleting campaign:', err)
            setError(err.message)
            return false
        }
    }, [])

    const updateStatus = useCallback(async (id: string, newStatus: CampaignStatus): Promise<Campaign | null> => {
        try {
            const res = await fetch(`/api/campaigns/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    userEmail: getUserEmail(),
                }),
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Failed to update status')
            }

            const { campaign } = await res.json()
            setCampaigns(prev => prev.map(c => c.id === id ? campaign : c))
            return campaign
        } catch (err: any) {
            console.error('Error updating status:', err)
            setError(err.message)
            return null
        }
    }, [])

    const addCampaign = useCallback((campaign: Campaign) => {
        setCampaigns(prev => {
            if (prev.some(c => c.id === campaign.id)) return prev
            return [campaign, ...prev]
        })
    }, [])

    return {
        campaigns,
        loading,
        error,
        refetch: fetchCampaigns,
        createCampaign,
        updateCampaign,
        deleteCampaign,
        updateStatus,
        addCampaign,
    }
}

// Hook to get a single campaign
export function useCampaign(id: string | null) {
    const [campaign, setCampaign] = useState<Campaign | null>(null)
    const [activities, setActivities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchCampaign = useCallback(async () => {
        if (!id) {
            setCampaign(null)
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const res = await fetch(`/api/campaigns/${id}`)
            if (!res.ok) {
                throw new Error(`Failed to fetch campaign: ${res.statusText}`)
            }

            const data = await res.json()
            setCampaign(data.campaign)
            setActivities(data.activities || [])
        } catch (err: any) {
            console.error('Error fetching campaign:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        fetchCampaign()
    }, [fetchCampaign])

    return { campaign, activities, loading, error, refetch: fetchCampaign }
}
