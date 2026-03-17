const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

const ROOT_DIR = path.join(__dirname, '../../');
const PUBLIC_DIR = process.env.UPLOAD_BASE_PATH
    ? path.resolve(process.env.UPLOAD_BASE_PATH)
    : path.join(ROOT_DIR, 'public');

const MEDIA_FOLDERS = {
    urun: 'urun',
    kategori: 'kategori',
    marka: 'marka',
    blog: 'blog',
    general: 'general'
};

const getBaseUrl = () => {
    return process.env.PUBLIC_URL || process.env.API_BASE_URL || 'http://localhost:3082';
};

const getStaticUrlPrefix = () => {
    return process.env.STATIC_URL_PREFIX || '';
};

const paths = {
    root: ROOT_DIR,
    public: PUBLIC_DIR,
    src: path.join(ROOT_DIR, 'src'),

    environment: {
        isProduction,
        isDevelopment,
        nodeEnv: process.env.NODE_ENV || 'development'
    },

    mediaFolders: MEDIA_FOLDERS,

    getUploadPath: (...pathSegments) => {
        return path.join(PUBLIC_DIR, ...pathSegments);
    },

    getStaticPath: (folder) => {
        return path.join(PUBLIC_DIR, folder);
    },

    generateFileUrl: (filename, folder) => {
        const baseUrl = getBaseUrl();
        const staticPrefix = getStaticUrlPrefix();

        if (isProduction && staticPrefix) {

            return `${staticPrefix}/${folder}/${filename}`;
        }

        return `${baseUrl}/${folder}/${filename}`;
    },

    config: {
        apiBaseUrl: process.env.PUBLIC_URL || process.env.API_BASE_URL || 'http://localhost:3082',
        publicUrl: process.env.PUBLIC_URL || 'http://localhost:3082',
        staticUrlPrefix: process.env.STATIC_URL_PREFIX || '',

        environment: process.env.NODE_ENV || 'development',
        isProduction,
        isDevelopment,

        maxFileSize: 5 * 1024 * 1024,
        maxFileCount: 5,
        allowedFileTypes: /jpeg|jpg|png|gif|webp|svg/,

        uploadBasePath: process.env.UPLOAD_BASE_PATH || path.join(ROOT_DIR, 'public'),

        enableLogging: isDevelopment || process.env.ENABLE_DEBUG_LOGS === 'true',
        enableCompression: isProduction,
        cacheTimeout: isProduction ? 3600 : 0
    }
};


module.exports = paths;