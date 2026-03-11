import mcping from 'mcping-js';
import { PresenceUpdateStatus } from 'discord.js';

import { mcServerPort } from '../config.json';
import { logger } from '../logging';
import { Status, StatusUpdate } from '../util/types/status';

export default {
	name: 'displayServer',

	// Returns the status info on the minecraft server
	async execute() {
		const serverIP = process.env.mcServerIP;
		if (!serverIP) {
			logger.child({ mode: 'DISPLAY SEVER' }).error('Missing default minecraft server IP');
			return;
		}

		const server = new mcping.MinecraftServer(serverIP, parseInt(mcServerPort));
		return new Promise((resolve) => {
			// Pings the server for information
			server.ping(1000, 765, (err, res) => {
				// Server offline/errored
				if (!(typeof err === 'undefined' || err === null) || !res) {
					// console.log(err);
					resolve({
						message: 'an offline server :(',
						activity: PresenceUpdateStatus.DoNotDisturb
					} as StatusUpdate);
					return;
				}

				// Server online with no players
				if (typeof res.players.sample === 'undefined') {
					resolve({
						message: `${res.players.online}/${res.players.max} players`,
						activity: PresenceUpdateStatus.Idle
					} as StatusUpdate);
					return;
				}

				// Server is in sleep mode
				if (res.players.sample.length == 0) {
					resolve({
						message: 'a sleepy server',
						activity: PresenceUpdateStatus.Idle
					} as StatusUpdate);
					return;
				}

				// Gets the online players
				const onlinePlayers: string[] = [];

				// Server online with players
				if (!(typeof res.players.sample === 'undefined')) {
					for (const player of res.players.sample) onlinePlayers.push(player.name);
					const onlinePlayersMessage = onlinePlayers.sort().join(', ');

					resolve({
						message: `${res.players.online}/${res.players.max} players -\n ${onlinePlayersMessage}`,
						activity: PresenceUpdateStatus.Online
					} as StatusUpdate);
					return;
				}
			});
		});
	}
} as Status;
