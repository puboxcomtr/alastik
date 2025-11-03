module.exports = {
    apps: [
        {
            name: 'alastik-api',
            cwd: './apps/api',
            script: 'src/server.js',
            instances: 2,
            exec_mode: 'cluster',
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env_production: {
                NODE_ENV: 'production',
                PORT: 3082
            },
            error_file: './logs/api-error.log',
            out_file: './logs/api-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss'
        },
        {
            name: 'alastik-admin',
            cwd: './apps/admin',
            script: '.next/standalone/server.js',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env_production: {
                NODE_ENV: 'production',
                PORT: 3081,
                HOSTNAME: '0.0.0.0'
            },
            error_file: './logs/admin-error.log',
            out_file: './logs/admin-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss'
        }
    ]
};