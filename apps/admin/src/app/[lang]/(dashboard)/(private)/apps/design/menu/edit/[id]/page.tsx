import EditMenuForm from '@/views/design/menu/EditMenuForm'

type Props = {
    params: { id: string }
}

const EditMenuPage = ({ params }: Props) => {
    return <EditMenuForm menuId={params.id} />
}

export default EditMenuPage