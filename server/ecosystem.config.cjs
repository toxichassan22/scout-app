module.exports = {
  apps: [
    {
      name: 'scout-backend',
      script: './src/index.js',
      cwd: __dirname,
      instances: 1,            // SQLite requires a single Node process to avoid WAL lock/corruption
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: '/var/www/scout-app/logs/scout-error.log',
      out_file: '/var/www/scout-app/logs/scout-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // إعادة تشغيل تلقائية لو الـ memory زادت عن الحد
      node_args: '--max-old-space-size=450',
    },
  ],
};
