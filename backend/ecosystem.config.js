module.exports = {
  apps: [{
    name: 'prodeklarant-backend',
    script: 'dist/server.js',
    instances: process.env.NODE_ENV === 'production' ? 2 : 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M',
    watch: process.env.NODE_ENV === 'development',
    ignore_watch: ['node_modules', 'logs', 'dist']
  }]
};


