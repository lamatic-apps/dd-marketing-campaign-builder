"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    FileText,
    Mail,
    MessageSquare,
    Facebook,
    Instagram,
    Twitter,
    Copy,
    Check,
    Image as ImageIcon,
    Edit2,
    ChevronDown,
    ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface GeneratedContent {
    blog?: string
    email?: string | {
        subject?: string
        preview?: string
        body?: {
            greeting?: string
            hook?: string
            main_content?: string
            product_section?: string
            cta?: { text?: string; urgency?: string }
            signature?: string
        }
    }
    sms?: {
        sms_options?: Array<{ text: string; tone: string }>
        recommended?: number
    } | { executionMsg?: string }
    facebook?: {
        caption?: string
        hashtags?: string
        cta_type?: string
        image_prompt?: {
            description?: string
            style?: string
            mood?: string
        }
    } | { executionMsg?: string }
    instagram?: {
        caption?: string
        hashtags?: {
            primary?: string
            niche?: string
            community?: string
        }
        image_prompt?: string
        post_type?: string
    } | { executionMsg?: string }
    twitter?: {
        tweet?: string
        hashtags?: string
        thread?: string[]
        image_prompt?: string
    } | { executionMsg?: string }
}

interface ContentPreviewProps {
    content: GeneratedContent
    channels: string[]
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
    )
}

function BlogPreview({ content }: { content: string }) {
    const [expanded, setExpanded] = useState(false)
    const preview = content.slice(0, 500)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Badge variant="secondary">
                    <FileText className="w-3 h-3 mr-1" />
                    Markdown
                </Badge>
                <CopyButton text={content} />
            </div>
            <div className="prose prose-sm max-w-none bg-muted/50 rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                    {expanded ? content : preview + (content.length > 500 ? "..." : "")}
                </pre>
            </div>
            {content.length > 500 && (
                <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
                    {expanded ? (
                        <><ChevronUp className="w-4 h-4 mr-1" /> Show Less</>
                    ) : (
                        <><ChevronDown className="w-4 h-4 mr-1" /> Show More</>
                    )}
                </Button>
            )}
        </div>
    )
}

function EmailPreview({ content }: { content: any }) {
    // Handle JSON string or object
    let email = content
    if (typeof content === "string") {
        try {
            // Try to parse if it's a JSON code block
            const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
            if (jsonMatch) {
                email = JSON.parse(jsonMatch[1])
            } else {
                email = JSON.parse(content)
            }
        } catch {
            // If parsing fails, show raw content
            return (
                <div className="bg-muted/50 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm">{content}</pre>
                </div>
            )
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Badge variant="secondary">
                    <Mail className="w-3 h-3 mr-1" />
                    Email Template
                </Badge>
            </div>

            <div className="border rounded-lg overflow-hidden">
                {/* Email Header */}
                <div className="bg-muted p-4 border-b space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground w-20">Subject:</span>
                        <span className="font-semibold">{email.subject || "No subject"}</span>
                    </div>
                    {email.preview && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground w-20">Preview:</span>
                            <span className="text-sm text-muted-foreground">{email.preview}</span>
                        </div>
                    )}
                </div>

                {/* Email Body */}
                <div className="p-4 space-y-4 bg-white">
                    {email.body?.greeting && (
                        <p className="font-medium">{email.body.greeting}</p>
                    )}
                    {email.body?.hook && (
                        <p>{email.body.hook}</p>
                    )}
                    {email.body?.main_content && (
                        <div className="whitespace-pre-wrap">{email.body.main_content}</div>
                    )}
                    {email.body?.product_section && (
                        <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap">
                            {email.body.product_section}
                        </div>
                    )}
                    {email.body?.cta && (
                        <div className="text-center py-4">
                            <Button className="bg-primary">{email.body.cta.text || "Shop Now"}</Button>
                            {email.body.cta.urgency && (
                                <p className="text-sm text-muted-foreground mt-2">{email.body.cta.urgency}</p>
                            )}
                        </div>
                    )}
                    {email.body?.signature && (
                        <p className="text-muted-foreground whitespace-pre-wrap">{email.body.signature}</p>
                    )}
                </div>
            </div>
        </div>
    )
}

function SMSPreview({ content }: { content: any }) {
    if (content?.executionMsg) {
        return (
            <div className="text-muted-foreground text-sm p-4 bg-muted rounded-lg">
                {content.executionMsg}
            </div>
        )
    }

    const options = content?.sms_options || []
    const recommended = content?.recommended ?? 0

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Badge variant="secondary">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {options.length} Options
                </Badge>
            </div>

            <div className="space-y-3">
                {options.map((option: any, i: number) => (
                    <div
                        key={i}
                        className={cn(
                            "border rounded-lg p-4 relative",
                            i === recommended && "border-primary ring-1 ring-primary"
                        )}
                    >
                        {i === recommended && (
                            <Badge className="absolute -top-2 right-2 bg-primary text-xs">
                                Recommended
                            </Badge>
                        )}
                        <p className="text-sm mb-2">{option.text}</p>
                        <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">{option.tone}</Badge>
                            <span className="text-xs text-muted-foreground">
                                {option.text?.length || 0} chars
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function SocialPreview({
    content,
    platform
}: {
    content: any
    platform: "facebook" | "instagram" | "twitter"
}) {
    if (content?.executionMsg) {
        return (
            <div className="text-muted-foreground text-sm p-4 bg-muted rounded-lg">
                {content.executionMsg}
            </div>
        )
    }

    const icons = {
        facebook: Facebook,
        instagram: Instagram,
        twitter: Twitter,
    }
    const Icon = icons[platform]

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Badge variant="secondary">
                    <Icon className="w-3 h-3 mr-1" />
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </Badge>
                {content?.post_type && (
                    <Badge variant="outline">{content.post_type}</Badge>
                )}
                {content?.cta_type && (
                    <Badge variant="outline">{content.cta_type}</Badge>
                )}
            </div>

            {/* Caption */}
            <div className="border rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">
                    {content?.caption || content?.tweet || "No content"}
                </p>
            </div>

            {/* Hashtags */}
            {content?.hashtags && (
                <div className="flex flex-wrap gap-2">
                    {typeof content.hashtags === "string" ? (
                        <span className="text-sm text-blue-600">{content.hashtags}</span>
                    ) : (
                        <>
                            {content.hashtags.primary && (
                                <span className="text-sm text-blue-600">{content.hashtags.primary}</span>
                            )}
                            {content.hashtags.niche && (
                                <span className="text-sm text-blue-500">{content.hashtags.niche}</span>
                            )}
                            {content.hashtags.community && (
                                <span className="text-sm text-blue-400">{content.hashtags.community}</span>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Twitter Thread */}
            {platform === "twitter" && content?.thread && (
                <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium">Thread ({content.thread.length} tweets):</p>
                    <div className="space-y-2 pl-4 border-l-2 border-muted">
                        {content.thread.map((tweet: string, i: number) => (
                            <div key={i} className="bg-muted/50 rounded p-3 text-sm">
                                {tweet}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Image Prompt */}
            {(content?.image_prompt) && (
                <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                        <ImageIcon className="w-4 h-4" />
                        Image Prompt
                    </div>
                    {typeof content.image_prompt === "string" ? (
                        <p className="text-sm text-muted-foreground">{content.image_prompt}</p>
                    ) : (
                        <div className="space-y-1 text-sm text-muted-foreground">
                            <p>{content.image_prompt.description}</p>
                            {content.image_prompt.style && (
                                <p><span className="font-medium">Style:</span> {content.image_prompt.style}</p>
                            )}
                            {content.image_prompt.mood && (
                                <p><span className="font-medium">Mood:</span> {content.image_prompt.mood}</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export function ContentPreview({ content, channels }: ContentPreviewProps) {
    const availableChannels = channels.filter(ch => {
        const c = content[ch as keyof GeneratedContent]
        return c && !(c as any)?.executionMsg?.includes("Skipped")
    })

    const skippedChannels = channels.filter(ch => {
        const c = content[ch as keyof GeneratedContent]
        return (c as any)?.executionMsg?.includes("Skipped")
    })

    if (availableChannels.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No content generated yet
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Tabs defaultValue={availableChannels[0]} className="w-full">
                <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
                    {availableChannels.map((channel) => (
                        <TabsTrigger key={channel} value={channel} className="capitalize">
                            {channel === "blog" && <FileText className="w-4 h-4 mr-1" />}
                            {channel === "email" && <Mail className="w-4 h-4 mr-1" />}
                            {channel === "sms" && <MessageSquare className="w-4 h-4 mr-1" />}
                            {channel === "facebook" && <Facebook className="w-4 h-4 mr-1" />}
                            {channel === "instagram" && <Instagram className="w-4 h-4 mr-1" />}
                            {channel === "twitter" && <Twitter className="w-4 h-4 mr-1" />}
                            {channel}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* Blog */}
                {content.blog && (
                    <TabsContent value="blog">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Blog Post</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BlogPreview content={content.blog} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* Email */}
                {content.email && (
                    <TabsContent value="email">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Email Campaign</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <EmailPreview content={content.email} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* SMS */}
                {content.sms && !(content.sms as any)?.executionMsg?.includes("Skipped") && (
                    <TabsContent value="sms">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">SMS Messages</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SMSPreview content={content.sms} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* Facebook */}
                {content.facebook && !(content.facebook as any)?.executionMsg?.includes("Skipped") && (
                    <TabsContent value="facebook">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Facebook Post</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SocialPreview content={content.facebook} platform="facebook" />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* Instagram */}
                {content.instagram && !(content.instagram as any)?.executionMsg?.includes("Skipped") && (
                    <TabsContent value="instagram">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Instagram Post</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SocialPreview content={content.instagram} platform="instagram" />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* Twitter */}
                {content.twitter && !(content.twitter as any)?.executionMsg?.includes("Skipped") && (
                    <TabsContent value="twitter">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Twitter/X Post</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SocialPreview content={content.twitter} platform="twitter" />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>

            {/* Skipped channels */}
            {skippedChannels.length > 0 && (
                <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Skipped channels:</span>{" "}
                    {skippedChannels.join(", ")}
                </div>
            )}
        </div>
    )
}
