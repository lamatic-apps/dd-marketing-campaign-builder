"use client"

import { useState, useCallback, useEffect } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronsUpDown, X, Package, Search, Loader2, Tag, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProductSearch, type Product, type TermSale, type TermSaleProduct } from "@/hooks/use-product-search"
import { useDebounce } from "@/hooks/use-debounce"

// Unified selection item that can be either a product or a term sale
export interface SelectedItem {
    type: 'product' | 'term_sale'
    // For products
    id?: number
    sku?: string
    name: string
    price?: number
    // For term sales
    term_sale_id?: string
    productCount?: number
    products?: TermSaleProduct[]
}

interface ProductSelectorProps {
    selectedProducts: SelectedItem[]
    onSelectionChange: (items: SelectedItem[]) => void
    maxSelections?: number
    placeholder?: string
}

export function ProductSelector({
    selectedProducts,
    onSelectionChange,
    maxSelections = 30,
    placeholder = "Search 3000+ products by name or SKU...",
}: ProductSelectorProps) {
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [expandedTermSales, setExpandedTermSales] = useState<Set<string>>(new Set())
    const debouncedQuery = useDebounce(searchQuery, 300)

    const { searchAsync, isLoading, error, products, term_sales } = useProductSearch()

    // Update search results when query changes
    useEffect(() => {
        async function performSearch() {
            if (debouncedQuery.length >= 2) {
                await searchAsync(debouncedQuery, 15)
            }
        }
        performSearch()
    }, [debouncedQuery, searchAsync])

    const toggleTermSaleExpand = (termSaleId: string) => {
        setExpandedTermSales(prev => {
            const next = new Set(prev)
            if (next.has(termSaleId)) {
                next.delete(termSaleId)
            } else {
                next.add(termSaleId)
            }
            return next
        })
    }

    const handleSelectProduct = useCallback(
        (product: Product) => {
            const item: SelectedItem = {
                type: 'product',
                id: product.id,
                sku: product.sku,
                name: product.name,
                price: product.price
            }
            const isSelected = selectedProducts.some((p) => p.type === 'product' && p.id === product.id)

            if (isSelected) {
                onSelectionChange(selectedProducts.filter((p) => !(p.type === 'product' && p.id === product.id)))
            } else if (selectedProducts.length < maxSelections) {
                onSelectionChange([...selectedProducts, item])
            }
        },
        [selectedProducts, onSelectionChange, maxSelections]
    )

    const handleSelectTermSale = useCallback(
        (termSale: TermSale) => {
            const item: SelectedItem = {
                type: 'term_sale',
                term_sale_id: termSale.term_sale_id,
                name: termSale.term_sale_id,
                productCount: termSale.products.length,
                products: termSale.products
            }
            const isSelected = selectedProducts.some((p) => p.type === 'term_sale' && p.term_sale_id === termSale.term_sale_id)

            if (isSelected) {
                onSelectionChange(selectedProducts.filter((p) => !(p.type === 'term_sale' && p.term_sale_id === termSale.term_sale_id)))
            } else if (selectedProducts.length < maxSelections) {
                onSelectionChange([...selectedProducts, item])
            }
        },
        [selectedProducts, onSelectionChange, maxSelections]
    )

    const handleRemove = useCallback(
        (item: SelectedItem) => {
            if (item.type === 'product') {
                onSelectionChange(selectedProducts.filter((p) => !(p.type === 'product' && p.id === item.id)))
            } else {
                onSelectionChange(selectedProducts.filter((p) => !(p.type === 'term_sale' && p.term_sale_id === item.term_sale_id)))
            }
        },
        [selectedProducts, onSelectionChange]
    )

    const totalResults = products.length + term_sales.length
    const hasResults = totalResults > 0

    return (
        <div className="space-y-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between bg-background font-normal h-auto min-h-10 py-2"
                    >
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Search className="w-4 h-4" />
                            <span>{placeholder}</span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command
                        shouldFilter={false}
                        className="flex flex-col max-h-[400px]"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        <CommandInput
                            placeholder="Type to search products or term sales..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                        />
                        <CommandList className="flex-1 overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
                            {isLoading ? (
                                <div className="py-6 text-center text-sm">
                                    <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-muted-foreground" />
                                    <span className="text-muted-foreground">Searching...</span>
                                </div>
                            ) : error ? (
                                <div className="py-6 text-center text-sm text-destructive">
                                    {error}
                                </div>
                            ) : !hasResults ? (
                                <CommandEmpty>
                                    {searchQuery.length < 2
                                        ? "Type at least 2 characters to search..."
                                        : "No products or term sales found."}
                                </CommandEmpty>
                            ) : (
                                <>
                                    {/* Term Sales Section */}
                                    {term_sales.length > 0 && (
                                        <CommandGroup heading={
                                            <span className="flex items-center gap-2">
                                                <Tag className="w-3 h-3" />
                                                Term Sales ({term_sales.length})
                                            </span>
                                        }>
                                            {term_sales.map((termSale) => {
                                                const isSelected = selectedProducts.some(
                                                    (p) => p.type === 'term_sale' && p.term_sale_id === termSale.term_sale_id
                                                )
                                                const isExpanded = expandedTermSales.has(termSale.term_sale_id)
                                                const isMaxReached = selectedProducts.length >= maxSelections && !isSelected

                                                return (
                                                    <div key={termSale.term_sale_id}>
                                                        <CommandItem
                                                            value={termSale.term_sale_id}
                                                            onSelect={() => !isMaxReached && handleSelectTermSale(termSale)}
                                                            disabled={isMaxReached}
                                                            className={cn(
                                                                "flex items-center gap-3 py-2 bg-amber-50/50 dark:bg-amber-950/20 border-l-2 border-amber-400",
                                                                isMaxReached && "opacity-50 cursor-not-allowed"
                                                            )}
                                                        >
                                                            <div
                                                                className={cn(
                                                                    "flex items-center justify-center w-4 h-4 border rounded",
                                                                    isSelected
                                                                        ? "bg-amber-500 border-amber-500 text-white"
                                                                        : "border-amber-400/50"
                                                                )}
                                                            >
                                                                {isSelected && <Check className="w-3 h-3" />}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    toggleTermSaleExpand(termSale.term_sale_id)
                                                                }}
                                                                className="p-0.5 hover:bg-amber-200/50 rounded"
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronDown className="w-4 h-4 text-amber-600" />
                                                                ) : (
                                                                    <ChevronRight className="w-4 h-4 text-amber-600" />
                                                                )}
                                                            </button>
                                                            <Tag className="w-4 h-4 text-amber-600 shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{termSale.term_sale_id}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {termSale.products.length} products on sale
                                                                </p>
                                                            </div>
                                                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                                                                Sale
                                                            </Badge>
                                                        </CommandItem>
                                                        {/* Expandable product list */}
                                                        {isExpanded && (
                                                            <div className="pl-12 py-1 bg-amber-50/30 dark:bg-amber-950/10 border-l-2 border-amber-200 ml-2">
                                                                {termSale.products.slice(0, 5).map((product) => (
                                                                    <div key={product.part_code} className="text-xs py-1 px-2 text-muted-foreground">
                                                                        <span className="font-medium">{product.name}</span>
                                                                        <span className="mx-2">•</span>
                                                                        <span className="text-amber-600">${product.final_price?.toFixed(2)}</span>
                                                                        {product.original_price > product.final_price && (
                                                                            <span className="ml-1 line-through text-muted-foreground/50">
                                                                                ${product.original_price?.toFixed(2)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                                {termSale.products.length > 5 && (
                                                                    <div className="text-xs py-1 px-2 text-amber-600 font-medium">
                                                                        +{termSale.products.length - 5} more products...
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </CommandGroup>
                                    )}

                                    {term_sales.length > 0 && products.length > 0 && (
                                        <CommandSeparator />
                                    )}

                                    {/* Products Section */}
                                    {products.length > 0 && (
                                        <CommandGroup heading={
                                            <span className="flex items-center gap-2">
                                                <Package className="w-3 h-3" />
                                                Products ({products.length})
                                            </span>
                                        }>
                                            {products.map((product) => {
                                                const isSelected = selectedProducts.some((p) => p.type === 'product' && p.id === product.id)
                                                const isMaxReached = selectedProducts.length >= maxSelections && !isSelected

                                                return (
                                                    <CommandItem
                                                        key={product.id}
                                                        value={`${product.name} ${product.sku}`}
                                                        onSelect={() => !isMaxReached && handleSelectProduct(product)}
                                                        disabled={isMaxReached}
                                                        className={cn(
                                                            "flex items-center gap-3 py-2",
                                                            isMaxReached && "opacity-50 cursor-not-allowed"
                                                        )}
                                                    >
                                                        <div
                                                            className={cn(
                                                                "flex items-center justify-center w-4 h-4 border rounded",
                                                                isSelected
                                                                    ? "bg-primary border-primary text-primary-foreground"
                                                                    : "border-muted-foreground/30"
                                                            )}
                                                        >
                                                            {isSelected && <Check className="w-3 h-3" />}
                                                        </div>
                                                        <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">{product.name}</p>
                                                            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                                                        </div>
                                                        <span className="text-sm font-medium text-muted-foreground">
                                                            ${product.price.toFixed(2)}
                                                        </span>
                                                    </CommandItem>
                                                )
                                            })}
                                        </CommandGroup>
                                    )}
                                </>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Selected Items */}
            {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedProducts.map((item) => (
                        <Badge
                            key={item.type === 'product' ? `p-${item.id}` : `ts-${item.term_sale_id}`}
                            variant="secondary"
                            className={cn(
                                "flex items-center gap-1.5 py-1 px-2",
                                item.type === 'term_sale'
                                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                    : "bg-primary/10 text-primary hover:bg-primary/20"
                            )}
                        >
                            {item.type === 'term_sale' ? (
                                <Tag className="w-3 h-3" />
                            ) : (
                                <Package className="w-3 h-3" />
                            )}
                            <span className="max-w-[150px] truncate text-xs">
                                {item.type === 'term_sale'
                                    ? `${item.term_sale_id} (${item.productCount} items)`
                                    : item.name
                                }
                            </span>
                            <button
                                type="button"
                                onClick={() => handleRemove(item)}
                                className="ml-1 hover:text-destructive transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            {selectedProducts.length >= maxSelections && (
                <p className="text-xs text-muted-foreground">
                    Maximum of {maxSelections} items selected
                </p>
            )}
        </div>
    )
}

// Re-export Product type for backward compatibility
export type { Product }
