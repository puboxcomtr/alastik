// Component Imports
import MontageForm from '@views/montage/form/MontageForm'

const MontageEditPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return <MontageForm montageId={id} />
}

export default MontageEditPage
