module.exports = {
  apps: [
    {
      name: 'alastik-api',
      script: 'src/server.js',
      cwd: './apps/api',
      instances: 'max', // CPU core sayısı kadar instance
      exec_mode: 'cluster',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3082
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3082
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3082
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      listen_timeout: 8000,
      shutdown_with_message: true,
      wait_ready: true,
      // Performance optimizations
      node_args: [
        '--max-old-space-size=1024',
        '--optimize-for-size'
      ],
      // Monitoring
      monitoring: false,
      pmx: true,
      // Auto-restart conditions
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        'uploads'
      ],
      // Graceful reload
      kill_retry_time: 10000
    },
    {
      name: 'alastik-web',
      script: 'npm',
      args: 'start',
      cwd: './apps/web',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 3080
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3080
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3080
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_file: './logs/web-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      listen_timeout: 8000,
      // Performance optimizations
      node_args: [
        '--max-old-space-size=512'
      ],
      // Monitoring
      monitoring: false,
      pmx: true,
      // Auto-restart conditions
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        '.next'
      ],
      // Graceful reload
      kill_retry_time: 10000
    },
    {
      name: 'alastik-admin',
      script: 'npm',
      args: 'start',
      cwd: './apps/web/admin',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '768M',
      env: {
        NODE_ENV: 'development',
        PORT: 3081
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3081
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3081
      },
      error_file: './logs/admin-error.log',
      out_file: './logs/admin-out.log',
      log_file: './logs/admin-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      listen_timeout: 8000,
      // Performance optimizations
      node_args: [
        '--max-old-space-size=768'
      ],
      // Monitoring
      monitoring: false,
      pmx: true,
      // Auto-restart conditions
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        '.next'
      ],
      // Graceful reload
      kill_retry_time: 10000
    }
  ],

  // Deploy configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['server1.alastik.com', 'server2.alastik.com'],
      ref: 'origin/main',
      repo: 'git@github.com:MelihDreal/alastik-b2c.git',
      path: '/var/www/alastik-backend',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y'
    },
    staging: {
      user: 'deploy',
      host: 'staging.alastik.com',
      ref: 'origin/develop',
      repo: 'git@github.com:MelihDreal/alastik-b2c.git',
      path: '/var/www/alastik-backend-staging',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging'
    }
  }
}; 