"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Check, X, Plus, Loader2, User as UserIcon, Mail } from "lucide-react"

export interface UserOption {
    id: string
    name: string
    email: string
    avatarUrl: string | null
}

export interface SelectedRecipient {
    id?: string
    email: string
    name?: string
    isCustom?: boolean
}

interface RecipientSelectorProps {
    users: UserOption[]
    loading: boolean
    selectedRecipients: SelectedRecipient[]
    onSelectionChange: (recipients: SelectedRecipient[]) => void
}

function getInitials(name?: string): string {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function RecipientSelector({ users, loading, selectedRecipients, onSelectionChange }: RecipientSelectorProps) {
    const [customEmail, setCustomEmail] = useState("")
    const [emailError, setEmailError] = useState("")

    const isUserSelected = (userId: string) => {
        return selectedRecipients.some(r => r.id === userId)
    }

    const isEmailSelected = (email: string) => {
        return selectedRecipients.some(r => r.email.toLowerCase() === email.toLowerCase())
    }

    const toggleUser = (user: UserOption) => {
        if (isUserSelected(user.id)) {
            onSelectionChange(selectedRecipients.filter(r => r.id !== user.id))
        } else {
            onSelectionChange([...selectedRecipients, { id: user.id, email: user.email, name: user.name }])
        }
    }

    const addCustomEmail = () => {
        const email = customEmail.trim()
        if (!email) return

        if (!isValidEmail(email)) {
            setEmailError("Please enter a valid email address")
            return
        }

        if (isEmailSelected(email)) {
            setEmailError("This email is already added")
            return
        }

        onSelectionChange([...selectedRecipients, { email, name: email.split('@')[0], isCustom: true }])
        setCustomEmail("")
        setEmailError("")
    }

    const removeRecipient = (email: string) => {
        onSelectionChange(selectedRecipients.filter(r => r.email.toLowerCase() !== email.toLowerCase()))
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            addCustomEmail()
        }
    }

    return (
        <div className="space-y-4">
            {/* Selected recipients as chips */}
            {selectedRecipients.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedRecipients.map((recipient) => (
                        <div
                            key={recipient.email}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-sm border border-primary/20"
                        >
                            {recipient.isCustom ? (
                                <Mail className="w-3 h-3" />
                            ) : (
                                <Check className="w-3 h-3" />
                            )}
                            <span className="max-w-[180px] truncate">{recipient.name || recipient.email}</span>
                            <button
                                type="button"
                                onClick={() => removeRecipient(recipient.email)}
                                className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* User list */}
            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading team members...</span>
                </div>
            ) : users.length === 0 ? (
                <div className="text-center py-6">
                    <UserIcon className="w-7 h-7 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No team members found.</p>
                    <p className="text-xs text-muted-foreground mt-1">Users need to log in at least once to appear here.</p>
                </div>
            ) : (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                    {users.map((user) => {
                        const selected = isUserSelected(user.id)
                        return (
                            <div
                                key={user.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleUser(user)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleUser(user) } }}
                                className={cn(
                                    "w-full flex items-center gap-3 p-2.5 rounded-lg border transition-colors text-left cursor-pointer",
                                    selected
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:bg-muted/50"
                                )}
                            >
                                <Checkbox checked={selected} onCheckedChange={() => toggleUser(user)} />
                                <Avatar className="w-8 h-8">
                                    <AvatarImage src={user.avatarUrl || undefined} referrerPolicy="no-referrer" />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                        {getInitials(user.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{user.name || 'Unknown'}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Custom email input */}
            <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-2">Or add an email manually:</p>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Input
                            type="email"
                            placeholder="name@example.com"
                            value={customEmail}
                            onChange={(e) => {
                                setCustomEmail(e.target.value)
                                setEmailError("")
                            }}
                            onKeyDown={handleKeyDown}
                            className="h-9 text-sm"
                        />
                        {emailError && (
                            <p className="text-xs text-destructive mt-1">{emailError}</p>
                        )}
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={addCustomEmail}
                        disabled={!customEmail.trim()}
                        className="h-9 px-3"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
