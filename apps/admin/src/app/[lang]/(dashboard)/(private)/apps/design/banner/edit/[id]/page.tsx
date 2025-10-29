import EditBannerForm from '@/views/design/banner/EditBannerForm'

type Props = {
    params: { id: string }
}

const EditBannerPage = ({ params }: Props) => {
    return <EditBannerForm bannerId={params.id} />
}

export default EditBannerPage