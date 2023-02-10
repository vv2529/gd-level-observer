import { Request, Response } from 'express'
import { FindOptions } from 'sequelize'
import { SavedCreator } from '../../../models.js'
import CreatorStorage from '../../../storage/Creators.js'
import { badRequest } from '../../functions.js'
import { SentCreator } from '../../types.js'

type ParsedQuery = {
	id: string
	noIDSearch?: boolean
}

type RawQuery = {
	[key in keyof ParsedQuery]?: string
}

const validNameList = /^[a-zA-Z0-9 ]{3,15}(,[a-zA-Z0-9 ]{3,15})*$/
const validIntList = /^[0-9]+(, ?[0-9]+)*$/

const getPlayers = async (filter: FindOptions, q: ParsedQuery): Promise<SentCreator[]> => {
	const response: SavedCreator[] = await CreatorStorage.get(filter)

	const players: SentCreator[] = response.map((raw: SavedCreator): SentCreator => {
		const player: SentCreator = {
			playerID: raw.playerID,
			name: raw.name,
			...(raw.accountID && { accountID: raw.accountID }),
		}

		return player
	})
	return players
}

const parseQuery = (q: RawQuery): ParsedQuery => {
	const id = q.id || ''
	const noIDSearch = 'noIDSearch' in q

	return {
		id,
		...(noIDSearch && { noIDSearch }),
	}
}

const handleRequest = async (req: Request, res: Response, rawQuery: RawQuery): Promise<void> => {
	try {
		const q = parseQuery(rawQuery)
		const { id } = q
		let playerIDs: number[] = []
		let playerNames: string[] = []
		let players: SentCreator[] = []
		let searchType: 'playerID' | 'name'

		if (!q.noIDSearch && validIntList.test(id)) searchType = 'playerID'
		else if (validNameList.test(id)) searchType = 'name'
		else
			throw 'Wrong search string. Acceptable formats: list of player IDs or list of valid player names.'

		let filter: FindOptions = {}

		if (searchType === 'playerID') {
			playerIDs = id
				.replace(/ /g, '')
				.split(',')
				.map((s) => +s)
				.filter((id, i, arr) => i === arr.indexOf(id))

			filter.where = { playerID: playerIDs }
			players = await getPlayers(filter, q)
			const ordered: SentCreator[] = []

			playerIDs.forEach((id) => {
				const player = players.find((player) => player.playerID === id)
				if (!player) return
				ordered.push(player)
			})

			players = ordered
		} else if (searchType === 'name') {
			playerNames = id
				.split(',')
				.map((s) => s.toLowerCase())
				.filter((name, i, arr) => i === arr.indexOf(name))

			filter.where = {
				name: playerNames,
			}
			players = await getPlayers(filter, q)
			const ordered: SentCreator[] = []

			playerNames.forEach((name) => {
				const player = players.find((player) => player.name.toLowerCase() === name)
				if (!player) return
				ordered.push(player)
			})

			players = ordered
		}

		res.status(200).json({
			count: players.length,
			result: players,
		})
	} catch (e) {
		if (typeof e === 'string') badRequest(res, e)
		else throw e
	}
}

const controller = {
	async get(req: Request, res: Response): Promise<void> {
		const q: RawQuery = { ...req.params, ...req.query }
		await handleRequest(req, res, q)
	},

	async post(req: Request, res: Response): Promise<void> {
		const q: RawQuery = req.body
		await handleRequest(req, res, q)
	},
}

export default controller
