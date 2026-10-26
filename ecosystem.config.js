module.exports = {
  apps: [{
    name: "next-smm-panel",
    script: "pnpm",
    args: "start -p 3030",
    cwd: __dirname,
    exec_mode: "fork",
    env: { NODE_ENV: "production", PORT: 3030 },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    error_file: "./logs/error.log",
    out_file: "./logs/out.log",
    merge_logs: true,
    time: true,
  }],
};
