export default class Discord {
	static composeMessage(pieces) {
		return Object.entries(pieces)
			.filter(([, items]) => items.length > 0)
			.map(([caption, items]) => `**${caption}**:\n${items.map((item) => `- ${item}`).join('\n')}`)
			.join('\n\n')
	}
}
