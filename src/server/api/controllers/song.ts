import { Request, Response } from 'express'
import { FindOptions } from 'sequelize'
import { SavedSong } from '../../../models.js'
import SongStorage from '../../../storage/Songs.js'
import { badRequest } from '../../functions.js'
import { SentSong } from '../../types.js'

type ParsedQuery = {
	id: string
}

type RawQuery = {
	[key in keyof ParsedQuery]?: string
}

const validWholeIntList = /^-?[0-9]+(, ?-?[0-9]+)*$/

const getSongs = async (filter: FindOptions, q: ParsedQuery): Promise<SentSong[]> => {
	const response: SavedSong[] = await SongStorage.get(filter)

	const songs: SentSong[] = response.map((raw: SavedSong): SentSong => {
		const custom = raw.id > 0
		const song: SentSong = {
			id: custom ? raw.id : ~raw.id,
			name: raw.name,
			artist: raw.artist,
			...(custom && { artistID: raw.artistID }),
			...(raw.size && { size: `${raw.size}MB` }),
			...(raw.link && { link: raw.link }),
			...(raw.videoID && { videoID: raw.videoID }),
			...(raw.youtubeURL && { youtubeURL: raw.youtubeURL }),
			...(custom && 'isVerified' in raw && { isVerified: raw.isVerified }),
			...(raw.songPriority && { songPriority: raw.songPriority }),
			custom,
		}

		return song
	})
	return songs
}

const parseQuery = (q: RawQuery): ParsedQuery => {
	const id = q.id || ''

	return {
		id,
	}
}

const handleRequest = async (req: Request, res: Response, rawQuery: RawQuery): Promise<void> => {
	try {
		const q = parseQuery(rawQuery)
		const { id } = q
		let songIDs: number[] = []
		let songs: SentSong[] = []

		if (!validWholeIntList.test(id))
			throw 'Wrong search string. Acceptable format: list of song IDs.'

		let filter: FindOptions = {}

		songIDs = id
			.replace(/ /g, '')
			.split(',')
			.map((s) => {
				const id = +s
				return id < 0 ? id - 1 : id
			})
			.filter((id, i, arr) => i === arr.indexOf(id))

		filter.where = { id: songIDs }
		songs = await getSongs(filter, q)
		const ordered: SentSong[] = []

		songIDs.forEach((id) => {
			const song = songs.find((song) => song.id === (song.custom ? id : ~id))
			if (!song) return
			ordered.push(song)
		})

		songs = ordered

		res.status(200).json({
			count: songs.length,
			result: songs,
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
