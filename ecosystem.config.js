module.exports = {
  apps: [
    {
      name: 'alastik-api',
      script: 'src/server.js',
      cwd: '/var/www/alastik/apps/api',
      instances: 1,
      exec_mode: 'cluster',
      env_production: { NODE_ENV: 'production', PORT: 3082 }
    },
    {
      name: 'alastik-admin',
      script: 'npm',
      args: 'start',
      cwd: './apps/admin',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '768M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3081
      },
    },
    {
      name: 'alastik-web',
      script: 'npm',
      args: 'start',
      cwd: './apps/web',
      exec_mode: 'fork',
      instances: 1,
      env_production: { NODE_ENV: 'production', PORT: 3080 }
    },
    {
      name: 'alastik-dia-worker',
      cwd: './apps/api',
      script: 'src/workers/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      kill_timeout: 70000,
      wait_ready: false,
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};