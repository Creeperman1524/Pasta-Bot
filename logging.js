const { createLogger, transports, format } = require('winston');

// Logging
const logLevels = {
	fatal: 0,
	error: 1,
	warn: 2,
	info: 3,
	debug: 4,
};

const consoleFormat = format.printf(({ level, message, mode }) => {
	return `[${mode}] ${level}: ${message}`;
});

exports.logger = createLogger({
	levels: logLevels,
	defaultMeta: { loggingVersion: 1 },
	format: format.combine(format.timestamp(), format.json()),
	transports: [
		new transports.Console({ level: 'debug', format: format.combine(format.colorize(), consoleFormat) }),
		new transports.File({ level: 'info', filename: './logs/log.log', timestamp: true }),
		new transports.File({ level: 'error', filename: './logs/error.log', timestamp: true }),
	],
});