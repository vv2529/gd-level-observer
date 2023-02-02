import { Updates } from '../interfaces.js'

export default class Discord {
	static composeMessage(pieces: Updates): string {
		return Object.entries(pieces)
			.filter(([, items]) => items.length > 0)
			.map(([caption, items]) => `**${caption}**:\n${items.map((item) => `- ${item}`).join('\n')}`)
			.join('\n\n')
	}
}
