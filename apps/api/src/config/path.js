const path = require('path');
const ROOT_DIR = path.join(__dirname, '../../');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const SRC_DIR = path.join(ROOT_DIR, 'src');

const MEDIA_FOLDERS = {
    urun: 'urun',
    kategori: 'kategori',
    marka: 'marka',
    general: 'general'
};

const paths = {
    root: ROOT_DIR,
    public: PUBLIC_DIR,
    src: SRC_DIR,

    mediaFolders: MEDIA_FOLDERS,

    getUploadPath: (...pathSegments) => {
        return path.join(PUBLIC_DIR, ...pathSegments);
    },

    getStaticPath: (folder) => {
        return path.join(PUBLIC_DIR, folder);
    },

    generateFileUrl: (filename, folder, baseUrl = null) => {
        const apiBaseUrl = baseUrl || process.env.API_BASE_URL || 'http://localhost:3082';
        return `${apiBaseUrl}/${folder}/${filename}`;
    },

    config: {
        apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3082',
        environment: process.env.NODE_ENV || 'development',
        maxFileSize: 5 * 1024 * 1024, 
        allowedFileTypes: /jpeg|jpg|png|gif|webp|svg/,
        maxFileCount: 5 
    }
};

module.exports = paths;