import MailAccountEditForm from '@views/mail/accounts/edit/MailAccountEditForm'

type Props = {
    params: Promise<{ id: string }>
}

const MailAccountEdit = async ({ params }: Props) => {
    const { id } = await params

    return <MailAccountEditForm accountId={id} />
}

export default MailAccountEdit