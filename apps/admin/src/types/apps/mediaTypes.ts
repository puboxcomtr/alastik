export interface MediaFile {
    id: string
    filename: string
    url: string
    size: number
    uploadDate: string
    folder: string
}

export interface MediaLibraryProps {
    open: boolean
    onClose: () => void
    onSelect: (files: MediaFile[]) => void
    multiple?: boolean
    folder?: string
    title?: string
    maxFileSize?: number
}