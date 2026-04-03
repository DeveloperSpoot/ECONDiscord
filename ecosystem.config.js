module.exports = {
  apps: [
    {
      name: "econ-slash-commands",
      script: "./index.js",
      interpreter: "node",
      env_file: ".env",
      watch: false,
      autorestart: true,
      max_restarts: 5,
      restart_delay: 5000
    }
  ]
};
