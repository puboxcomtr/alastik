'use client'

import CategoryForm from '@views/blogs/categories/CategoryForm'

type Props = {
    params: { id: string }
}

const BlogCategoryEditPage = ({ params }: Props) => {
    return <CategoryForm id={params.id} />
}

export default BlogCategoryEditPage
