import { DashboardLayout } from "@/components/dashboard-layout"
import { CampaignDetail } from "@/components/campaign-detail"

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <DashboardLayout>
      <CampaignDetail campaignId={id} />
    </DashboardLayout>
  )
}
