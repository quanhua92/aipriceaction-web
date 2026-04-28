import { createFileRoute } from '@tanstack/react-router'
import { VolumeProfileWidget } from '@/components/widgets/VolumeProfileWidget'

export const Route = createFileRoute('/volume-profile')({
  component: VolumeProfilePage,
})

function VolumeProfilePage() {
  return (
    <div className="p-4 md:p-6">
      <VolumeProfileWidget maxHeight="100vh" />
    </div>
  )
}
