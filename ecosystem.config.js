// PM2 deployment configuration

// NOTE: Will need to run this once:
// pm2 start ecosystem.config.js
// pm2 save
// pm2 startup

module.exports = {
	apps: [
		{
			name: 'PastaBot',
			script: 'dist/src/index.js',
			cwd: '/root/Pasta-Bot',
			instances: 1,
			exec_mode: 'fork',
			autorestart: true,
			watch: false,
			max_restarts: 5
		}
	]
};
