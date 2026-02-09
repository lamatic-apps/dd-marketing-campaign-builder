/**
 * Lamatic API helper functions
 * Calls server-side API route to keep secrets secure
 */

export interface LamaticResponse<T> {
    data?: {
        executeWorkflow?: {
            status: string
            result: T
        }
    }
    errors?: { message: string }[]
}

/**
 * Generate campaign content via Lamatic workflow
 */
export async function generateCampaign(params: {
    topic: string
    bundleId?: string
    products?: string[]
    channels_blog: string
    channels_email: string
    channels_sms: string
    channels_facebook: string
    channels_instagram: string
    channels_twitter: string
    notes?: string
    contentFocus?: string
}): Promise<LamaticResponse<any>> {
    const response = await fetch("/api/lamatic", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            action: "generate-campaign",
            ...params,
        }),
    })

    return response.json()
}

/**
 * Search products by keyword using the Lamatic workflow
 * Returns both BigCommerce products and matching term sales
 */
export interface ProductSearchResult {
    products: any[]
    term_sales: {
        term_sale_id: string
        products: any[]
    }[]
    products_count: number
    term_sales_count: number
    keyword: string
}

export async function searchProducts(keyword: string): Promise<ProductSearchResult> {
    try {
        const response = await fetch("/api/lamatic", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                action: "search-products",
                keyword,
            }),
        })

        const data: LamaticResponse<any> = await response.json()

        if (data.errors) {
            console.error("Lamatic API error:", data.errors)
            return { products: [], term_sales: [], products_count: 0, term_sales_count: 0, keyword }
        }

        const result = data.data?.executeWorkflow?.result
        return {
            products: result?.products || [],
            term_sales: result?.term_sales || [],
            products_count: result?.products_count || 0,
            term_sales_count: result?.term_sales_count || 0,
            keyword: result?.keyword || keyword
        }
    } catch (error) {
        console.error("Product search API error:", error)
        return { products: [], term_sales: [], products_count: 0, term_sales_count: 0, keyword }
    }
}
