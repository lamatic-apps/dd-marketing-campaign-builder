import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Use the configured site URL for redirects to avoid origin mismatches
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin

    // Handle OAuth errors from the provider
    if (error) {
        console.error('OAuth error:', error, errorDescription)
        return NextResponse.redirect(
            `${siteUrl}/login?error=${encodeURIComponent(errorDescription || error)}`
        )
    }

    if (code) {
        const cookieStore = await cookies()

        // We need to collect cookies that supabase sets during exchange
        const cookiesToSet: { name: string; value: string; options: any }[] = []

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(newCookies) {
                        // Collect cookies to set on the redirect response
                        newCookies.forEach((cookie) => {
                            cookiesToSet.push(cookie)
                        })
                        // Also try setting on the cookie store (may fail in route handler)
                        try {
                            newCookies.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // Expected in route handlers
                        }
                    },
                },
            }
        )

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
            console.error('Session exchange error:', exchangeError.message)
            return NextResponse.redirect(
                `${siteUrl}/login?error=${encodeURIComponent(exchangeError.message)}`
            )
        }

        // Successful auth - redirect to home and set session cookies on the response
        const response = NextResponse.redirect(`${siteUrl}/`)
        cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
        })
        return response
    }

    // No code provided - redirect to login
    return NextResponse.redirect(`${siteUrl}/login`)
}
