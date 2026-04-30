import PurchaseLimitForm from '@views/purchase-limits/form/PurchaseLimitForm'

const PurchaseLimitEditPage = ({ params }: { params: { id: string; lang: string } }) => {
    return <PurchaseLimitForm isEdit={true} id={params.id} />
}

export default PurchaseLimitEditPage