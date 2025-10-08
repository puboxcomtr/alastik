import { getBlogById } from '@/utils/api/blogs'
import BlogForm from '@/views/blogs/add/BlogForm'

type Props = {
    params: { id: string }
}

const BlogEdit = async ({ params }: Props) => {
    const blog = await getBlogById(params.id)

    return <BlogForm blog={blog} isEdit={true} />
}

export default BlogEdit