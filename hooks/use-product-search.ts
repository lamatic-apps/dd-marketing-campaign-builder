"use client"

import { useState, useCallback } from "react"
import { searchProducts as searchProductsApi, type ProductSearchResult } from "@/lib/lamatic-api"

export interface Product {
    id: number
    sku: string
    name: string
    price: number
    is_visible: boolean
}

export interface TermSaleProduct {
    part_code: string
    name: string
    brand: string
    original_price: number
    discount_price: number
    final_price: number
    start_date: string | null
    end_date: string | null
    pos_ecomm: string
}

export interface TermSale {
    term_sale_id: string
    products: TermSaleProduct[]
}

export interface SearchResults {
    products: Product[]
    term_sales: TermSale[]
    products_count: number
    term_sales_count: number
}

export function useProductSearch() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastResults, setLastResults] = useState<SearchResults>({
        products: [],
        term_sales: [],
        products_count: 0,
        term_sales_count: 0
    })

    // Async search that calls the API
    const searchAsync = useCallback(async (query: string, limit = 20): Promise<SearchResults> => {
        if (!query || query.length < 2) {
            const empty = { products: [], term_sales: [], products_count: 0, term_sales_count: 0 }
            setLastResults(empty)
            return empty
        }

        setIsLoading(true)
        setError(null)

        try {
            const apiResults = await searchProductsApi(query)

            // Map BigCommerce products to Product interface
            const products = (apiResults.products || []).slice(0, limit).map((item: any, index: number) => ({
                id: item.id || index,
                sku: item.sku || "",
                name: item.name || item.title || "",
                price: parseFloat(item.price) || 0,
                is_visible: item.is_visible ?? true,
            }))

            // Map term sales
            const term_sales = (apiResults.term_sales || []).map((sale: any) => ({
                term_sale_id: sale.term_sale_id,
                products: (sale.products || []).map((p: any) => ({
                    part_code: p.part_code,
                    name: p.name,
                    brand: p.brand,
                    original_price: p.original_price || 0,
                    discount_price: p.discount_price || 0,
                    final_price: p.final_price || 0,
                    start_date: p.start_date,
                    end_date: p.end_date,
                    pos_ecomm: p.pos_ecomm
                }))
            }))

            const results = {
                products,
                term_sales,
                products_count: products.length,
                term_sales_count: term_sales.length
            }

            setLastResults(results)
            setIsLoading(false)
            return results
        } catch (err) {
            console.error("API search failed:", err)
            setError("Failed to search products")
            setIsLoading(false)
            return { products: [], term_sales: [], products_count: 0, term_sales_count: 0 }
        }
    }, [])

    return {
        results: lastResults,
        products: lastResults.products,
        term_sales: lastResults.term_sales,
        isLoading,
        error,
        searchAsync,
        totalProducts: lastResults.products_count,
        totalTermSales: lastResults.term_sales_count,
    }
}
