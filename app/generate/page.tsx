"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Sparkles, FileText, Mail, MessageSquare, Facebook, Instagram, Twitter, Anchor, ExternalLink, FolderOpen, FileCheck } from "lucide-react"

// Removed hardcoded secrets - now using /api/lamatic route

export default function GeneratePage() {
    const [topic, setTopic] = useState("")
    const [bundleId, setBundleId] = useState("")
    const [notes, setNotes] = useState("")
    const [channels, setChannels] = useState({
        blog: true,
        email: true,
        sms: true,
        facebook: true,
        instagram: true,
        twitter: true,
    })
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{
        docUrl?: string
        folderUrl?: string
        folderName?: string
        title?: string
    } | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleGenerate = async () => {
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            // Call internal API route instead of direct GraphQL call
            const response = await fetch("/api/lamatic", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    topic,
                    bundleId,
                    product: [],
                    channels: {
                        blog: channels.blog ? "true" : "false",
                        email: channels.email ? "true" : "false",
                        sms: channels.sms ? "true" : "false",
                        facebook: channels.facebook ? "true" : "false",
                        instagram: channels.instagram ? "true" : "false",
                        twitter: channels.twitter ? "true" : "false",
                    },
                    notes,
                }),
            })

            const data = await response.json()

            if (!response.ok || data.error) {
                setError(data.error || "Unknown error")
            } else {
                setResult(data)
            }
        } catch (err: any) {
            setError(err.message || "Network error")
        } finally {
            setLoading(false)
        }
    }

    const toggleChannel = (ch: keyof typeof channels) => {
        setChannels(prev => ({ ...prev, [ch]: !prev[ch] }))
    }

    const activeChannels = Object.entries(channels).filter(([_, v]) => v).map(([k]) => k)

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b bg-card p-4">
                <div className="max-w-4xl mx-auto flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                        <Anchor className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-lg">Divers Direct</h1>
                        <p className="text-xs text-muted-foreground">AI Campaign Generator</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 space-y-6">
                {/* Input Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            Generate Campaign Content
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="topic">Campaign Topic *</Label>
                                <Input
                                    id="topic"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g., New Year Diving Resolutions"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bundle">Bundle ID (optional)</Label>
                                <Input
                                    id="bundle"
                                    value={bundleId}
                                    onChange={(e) => setBundleId(e.target.value)}
                                    placeholder="e.g., 1225APP"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes / Special Instructions (optional)</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g., Focus on EVO products, highlight winter diving benefits, avoid price mentions..."
                                rows={3}
                            />
                        </div>

                        <div className="space-y-3">
                            <Label>Channels</Label>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                {Object.entries(channels).map(([key, value]) => (
                                    <div
                                        key={key}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${value ? "bg-primary/10 border-primary" : "bg-muted"}`}
                                        onClick={() => toggleChannel(key as keyof typeof channels)}
                                    >
                                        <div className="flex items-center gap-2">
                                            {key === "blog" && <FileText className="w-4 h-4" />}
                                            {key === "email" && <Mail className="w-4 h-4" />}
                                            {key === "sms" && <MessageSquare className="w-4 h-4" />}
                                            {key === "facebook" && <Facebook className="w-4 h-4" />}
                                            {key === "instagram" && <Instagram className="w-4 h-4" />}
                                            {key === "twitter" && <Twitter className="w-4 h-4" />}
                                            <span className="text-sm capitalize">{key}</span>
                                        </div>
                                        <Switch checked={value} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button
                            onClick={handleGenerate}
                            disabled={loading || activeChannels.length === 0 || !topic.trim()}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
                            size="lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating... (this may take 60-90 seconds)
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate Content
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Error */}
                {error && (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-4">
                            <p className="text-red-600 font-medium">Error: {error}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Results - Google Doc Links */}
                {result && (
                    <Card className="border-green-200 bg-green-50/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-700">
                                <FileCheck className="w-5 h-5" />
                                Campaign Content Generated!
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {result.title && (
                                <p className="text-lg font-medium">{result.title}</p>
                            )}

                            {result.folderName && (
                                <p className="text-sm text-muted-foreground">
                                    Folder: {result.folderName}
                                </p>
                            )}

                            <div className="grid md:grid-cols-2 gap-4 pt-4">
                                {result.docUrl && (
                                    <a
                                        href={result.docUrl}
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

                                {result.folderUrl && (
                                    <a
                                        href={result.folderUrl}
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

                            <div className="pt-4 border-t">
                                <p className="text-sm text-muted-foreground">
                                    <strong>Next steps:</strong> Review the generated content in Google Docs, then add images and assets to the campaign folder.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

