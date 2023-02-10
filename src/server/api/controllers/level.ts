import { Request, Response } from 'express'
import { FindOptions, Op } from 'sequelize'
import Level from '../../../class/Level.js'
import { SavedLevel } from '../../../models.js'
import LevelStorage from '../../../storage/Levels.js'
import { badRequest } from '../../functions.js'
import { SentLevel } from '../../types.js'

type ParsedQuery = {
	id: string
	noIDSearch?: boolean
	lessVerbose?: boolean
	page: number
	count: number
	order: string
	orderDirection: '' | 'ASC' | 'DESC'
	difficulty?: number[]
	demonDifficulty?: number[]
	coins?: number[]
	coinsType?: number[]
	cp?: number[]
	length?: number[]
	twoPlayer?: boolean
	author?: number[]
	song?: number[]
	officialSong?: boolean
}

type RawQuery = {
	[key in keyof ParsedQuery]?: string
}

const validName = /^[a-zA-Z0-9 -]{1,20}$/
const validIntList = /^[0-9]+(, ?[0-9]+)*$/
const validIntRange = /^[0-9]*-[0-9]+$|^[0-9]+\.\.[0-9]*$/

const orders: { [key: string]: [[string, 'ASC' | 'DESC']] } = {
	id: [['id', 'DESC']],
	downloads: [['downloads', 'DESC']],
	likes: [['likes', 'DESC']],
	// list
}
const validOrders = Object.keys(orders)

const getLevels = async (filter: FindOptions, q: ParsedQuery): Promise<SentLevel[]> => {
	const response: SavedLevel[] = await LevelStorage.get(filter)

	const levels: SentLevel[] = response.map((raw: SavedLevel): SentLevel => {
		const level: SentLevel = {
			id: raw.id,
			name: raw.name,
			description: raw.description,
			...(!q.lessVerbose && { difficulty: Level.getDifficultyText(raw) }),
			downloads: raw.downloads,
			likes: raw.likes,
			cp: raw.cp,
			stars: raw.stars,
			coins: raw.coins,
			verifiedCoins: raw.verifiedCoins,
			length: q.lessVerbose ? raw.length : Level.getLengthText(raw.length),
			demonDifficulty: raw.demonDifficulty,
			updatedInGameVersion: Level.getIngameVersion(raw.gameVersion || 0),
			releasedInGameVersion: Level.getVersionByID(raw.id),
			version: raw.version,
			copiedID: raw.copiedID,
			twoPlayer: raw.twoPlayer,
			starsRequested: raw.starsRequested,
			objects: raw.objects,
			refreshedAt: raw.updatedAt,
			author: {
				playerID: raw.author.playerID,
				name: raw.author.name,
				...(raw.author.accountID && { accountID: raw.author.accountID }),
			},
			song: {
				id: raw.song.id > 0 ? raw.song.id : ~raw.song.id,
				name: raw.song.name,
				artist: raw.song.artist,
				...(raw.song.id > 0 && {
					size: q.lessVerbose ? raw.song.size : `${raw.song.size}MB`,
					link: raw.song.link,
				}),
				custom: raw.song.id > 0,
			},
		}

		return level
	})
	return levels
}

const parseRangeList = (list: string, map: { [key: string]: string } = {}): number[] => {
	return list
		.split(',')
		.map((s) => {
			const item = map[s]
			if (s.includes('-')) {
				const [from, to] = s.split('-').map((s) => +s)
				const range = []
				for (let i = from; i <= to; i++) range.push(i)
				return range.join(',')
			} else if (item) return item
			else return s
		})
		.join(',')
		.split(',')
		.map((s) => +s)
}

const parseQuery = (q: RawQuery): ParsedQuery => {
	const id = q.id || ''
	const noIDSearch = 'noIDSearch' in q
	const lessVerbose = 'lessVerbose' in q

	const page = +(q.page || 0) || 0

	const count = +(q.count || 0) || 10
	if (count < 1) throw 'Count must be at least 1.'

	let order: string = ''
	if (q.order && validOrders.includes(q.order)) order = q.order

	let orderDirection: ParsedQuery['orderDirection'] = ''
	if (q.orderDirection?.toUpperCase() === 'ASC') orderDirection = 'ASC'
	else if (q.orderDirection?.toUpperCase() === 'DESC') orderDirection = 'DESC'

	const difficulty: number[] = q.difficulty
		? parseRangeList(q.difficulty, {
				auto: '1',
				easy: '2',
				normal: '3',
				hard: '4,5',
				harder: '6,7',
				insane: '8,9',
				demon: '10',
		  })
		: []

	const demonDifficulty: number[] = q.demonDifficulty
		? parseRangeList(q.demonDifficulty, {
				easy: '1',
				medium: '2',
				hard: '3',
				insane: '4',
				extreme: '5',
		  })
		: []

	const coins: number[] = !('coins' in q)
		? []
		: !q.coins || typeof q.coins !== 'string'
		? [1, 2, 3]
		: q.coins.split(',').map((s) => +s)

	const coinsType: number[] = q.coinsType
		? parseRangeList(q.coinsType, {
				bronze: '0',
				silver: '1',
		  })
		: []

	const cp: number[] = q.cp ? q.cp.split(',').map((s) => +s) : []

	const length: number[] = q.length
		? parseRangeList(q.length, {
				Tiny: '0',
				Short: '1',
				Medium: '2',
				Long: '3',
				XL: '4',
		  })
		: []

	const twoPlayer = 'twoPlayer' in q

	const author: number[] = q.author ? q.author.split(',').map((s) => +s) : []

	const song: number[] = q.song ? q.song.split(',').map((s) => +s) : []

	const officialSong = 'officialSong' in q

	return {
		id,
		...(noIDSearch && { noIDSearch }),
		...(lessVerbose && { lessVerbose }),
		page,
		count,
		order,
		orderDirection,
		...(q.difficulty && { difficulty }),
		...(q.demonDifficulty && { demonDifficulty }),
		...('coins' in q && { coins }),
		...(q.coinsType && { coinsType }),
		...(q.cp && { cp }),
		...(q.length && { length }),
		...(twoPlayer && { twoPlayer }),
		...(q.author && { author }),
		...(q.song && { song }),
		...(officialSong && { officialSong }),
	}
}

const handleRequest = async (req: Request, res: Response, rawQuery: RawQuery): Promise<void> => {
	try {
		const q = parseQuery(rawQuery)
		const { id } = q
		let levelIDs: number[] = []
		let searchType: '' | 'all' | 'name' | 'IDList' | 'IDRange' = ''

		if (!id) searchType = 'all'
		else if (!q.noIDSearch && validIntList.test(id)) searchType = 'IDList'
		else if (!q.noIDSearch && validIntRange.test(id)) searchType = 'IDRange'
		else if (validName.test(id)) searchType = 'name'

		let filter: FindOptions = {
			limit: q.count,
			offset: q.page * q.count,
		}

		if (searchType === 'all') {
			//
		} else if (searchType === 'IDList') {
			q.order ||= 'list'
			q.page = 0
			delete filter.limit
			delete filter.offset

			levelIDs = id
				.replace(/ /g, '')
				.split(',')
				.map((s) => +s)
				.filter((id, i, arr) => i === arr.indexOf(id))

			filter.where = { id: levelIDs }
		} else if (searchType === 'IDRange') {
			q.order ||= 'id'

			const [fromStr, toStr] = id.split('-')
			const [from, to] = [fromStr, toStr].map((s) => +s)

			if (fromStr && toStr && from > to) {
				throw 'Invalid ID range: lower boundary is greater than the upper.'
			} else {
				filter.where = { id: {} }
				if (fromStr) filter.where.id[Op.gte] = from
				if (toStr) filter.where.id[Op.lte] = to
			}
		} else if (searchType === 'name') {
			filter.where = {
				name: {
					[Op.startsWith]: id,
				},
			}
		} else {
			throw 'Wrong search string. Acceptable formats: list/range of level IDs or a valid level name.'
		}

		if (!q.order) q.order = 'likes'
		if (!['list'].includes(q.order)) {
			if (q.orderDirection) orders[q.order][0][1] = q.orderDirection
			filter.order = orders[q.order]
		}

		filter.where = {
			...filter.where,
			...(q.difficulty && { stars: q.difficulty }),
			...(q.demonDifficulty && { demonDifficulty: [0, ...q.demonDifficulty] }),
			...(q.coins && { coins: q.coins }),
			...(q.coinsType && { verifiedCoins: q.coinsType }),
			...(q.cp && { cp: q.cp }),
			...(q.length && { length: q.length }),
			...(q.twoPlayer && { twoPlayer: true }),
			...(q.author && { playerID: q.author }),
			...(q.song && { songID: q.officialSong ? ~q.song : q.song }),
		}

		let levels = await getLevels(filter, q)
		delete filter.limit
		delete filter.offset
		const total = q.order === 'list' ? levels.length : await LevelStorage.count(filter)

		if (q.order === 'list') {
			let ordered: SentLevel[] = []

			levelIDs.forEach((id) => {
				const level = levels.find((level) => level.id === id)
				if (!level) return
				ordered.push(level)
			})

			levels = ordered
		}

		res.status(200).json({
			total,
			count: levels.length,
			page: q.page,
			result: levels,
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
