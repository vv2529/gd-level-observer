export default class Creator {
	declare playerID: number
	declare name: string
	declare accountID?: number

	static readonly fallback: Creator = {
		playerID: 0,
		name: '?',
	}
}
