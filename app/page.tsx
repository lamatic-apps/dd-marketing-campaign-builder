import { DashboardLayout } from "@/components/dashboard-layout"
import { CampaignCalendarDragDrop } from "@/components/campaign-calendar-dnd"

export default function Home() {
  return (
    <DashboardLayout>
      <CampaignCalendarDragDrop />
    </DashboardLayout>
  )
}
