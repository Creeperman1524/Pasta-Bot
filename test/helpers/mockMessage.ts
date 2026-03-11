import { EventEmitter } from 'node:events';
import { EmbedBuilder } from 'discord.js';

/**
 * A minimal fake InteractionCollector that lets tests drive button events.
 * Call `.emit('collect', button)` to simulate a button press.
 * Call `.stop()` to emit the 'end' event (mirrors discord.js collector behaviour).
 */
export class MockCollector extends EventEmitter {
	stop() {
		this.emit('end');
	}
}

/**
 * A minimal fake discord.js Message whose `createMessageComponentCollector`
 * returns a controllable MockCollector.
 *
 * Pass the EmbedBuilder(s) that were sent to `editReply` so that the game's
 * subsequent `EmbedBuilder.from(game.embed.embeds[0])` calls work correctly.
 */
export function createMockMessage(embeds: EmbedBuilder[] = [new EmbedBuilder()]) {
	const collector = new MockCollector();
	return {
		embeds,
		createMessageComponentCollector: jest.fn().mockReturnValue(collector),
		_collector: collector
	};
}
