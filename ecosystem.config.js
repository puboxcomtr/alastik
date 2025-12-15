module.exports = {
  apps: [
    {
      name: 'alastik-api',
      script: 'src/server.js',
      cwd: './apps/api',
      instances: 2,
      exec_mode: 'cluster',
      env_production: { NODE_ENV: 'production', PORT: 3082 }
    },
    {
      name: 'alastik-admin',
      script: 'npm',
      args: 'start',
      cwd: './apps/admin',
      instances: 1,
      env_production: { NODE_ENV: 'production', PORT: 3081 }
    },
    {
      name: 'alastik-web',
      script: 'npm',
      args: 'start',
      cwd: './apps/web',
      instances: 1,
      env_production: { NODE_ENV: 'production', PORT: 3081 }
    },
    {
      name: 'alastik-dia-worker',
      script: 'src/workers/index.js',
      cwd: './apps/api',
      instances: 1,
      exec_mode: 'fork',
      env_production: { NODE_ENV: 'production' }
    }
  ]
};