import TemplateForm from '@views/products/descriptions/TemplateForm'

type Props = {
    params: Promise<{ id: string; lang: string }>
}

const EditTemplatePage = async ({ params }: Props) => {
    const { id } = await params
    return <TemplateForm mode='edit' templateId={id} />
}

export default EditTemplatePage