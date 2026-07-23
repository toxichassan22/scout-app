module.exports = {
  apps: [
    {
      name: 'scout-backend',
      script: './src/index.js',
      instances: 'max',        // استخدم كل الـ CPU Cores
      exec_mode: 'cluster',    // Cluster Mode للـ load balancing
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: '/var/log/scout-error.log',
      out_file: '/var/log/scout-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // إعادة تشغيل تلقائية لو الـ memory زادت عن الحد
      node_args: '--max-old-space-size=450',
    },
  ],
};
