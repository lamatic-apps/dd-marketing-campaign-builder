import { DashboardLayout } from "@/components/dashboard-layout"
import { CampaignsList } from "@/components/campaigns-list"

export default function CampaignsPage() {
  return (
    <DashboardLayout>
      <CampaignsList />
    </DashboardLayout>
  )
}
