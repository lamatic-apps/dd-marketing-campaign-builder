import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"

export default function AnalyticsPage() {
    return (
        <DashboardLayout>
            <Suspense fallback={<div className="h-[50vh] flex items-center justify-center"><p className="text-muted-foreground animate-pulse">Loading...</p></div>}>
                <AnalyticsDashboard />
            </Suspense>
        </DashboardLayout>
    )
}
