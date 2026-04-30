import MailTemplateEditForm from '@views/mail/management/edit/MailTemplateEditForm'

type Props = {
    params: Promise<{ id: string }>
}

const MailManagementEdit = async ({ params }: Props) => {
    const { id } = await params

    return <MailTemplateEditForm templateId={id} />
}

export default MailManagementEdit