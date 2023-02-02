import config from '../config/settings.json' assert { type: 'json' }
import Level from '../class/Level.js'
import { createRequestBody, httpFetch } from '../scripts/functions.js'
import { AuthorRaw, GDFilter, LevelRaw, SearchResult, SongRaw } from '../interfaces.js'

export default class GDServer {
	static readonly defaultParams: GDFilter = {
		secret: 'Wmfd2893gb7',
		gameVersion: 21,
		binaryVersion: 35,
		gdw: 0,
		star: 1,
	}

	static readonly maxListLength: number = 1000

	static error(): SearchResult {
		return { total: 0, offset: 0, levels: [], result: 'error' }
	}
	static block(): SearchResult {
		return { total: 0, offset: 0, levels: [], result: 'block' }
	}

	static async fetchFromGD(filter: GDFilter): Promise<SearchResult> {
		filter = Object.assign({}, GDServer.defaultParams, filter)

		try {
			let rawData = await httpFetch(
				config.gd_server_search.url,
				{
					method: 'POST',
				},
				createRequestBody(filter)
			)

			if (rawData.startsWith('<br />')) {
				rawData = rawData.split('<br />').slice(2).join('<br />').trim()
			}
			if (!rawData) {
				return GDServer.block()
			}
			if (rawData == '-1') {
				return GDServer.error()
			}

			const gjData = rawData.split('#')
			const pageInfo = gjData[3].split(':')

			const result: SearchResult = {
				total: +pageInfo[0],
				offset: +pageInfo[1],
				result: 'success',
				levels: [],
			}
			if (!gjData[0]) return result

			const authors = gjData[1].split('|'),
				authorList: { [key: number]: AuthorRaw } = {}
			authors.forEach((x) => {
				if (x.startsWith('~')) return
				const author: AuthorRaw = x.split(':')
				authorList[+author[0]] = author
			})

			const songs = gjData[2].split('~:~').map((item) => `~${item}~`),
				songList: { [key: number]: SongRaw } = {}
			songs.forEach((x) => {
				const songRaw = x.slice(1, -1).split('~|~')
				let song: SongRaw = {}
				for (let i = 0; i < songRaw.length; i += 2) {
					song[+songRaw[i]] = songRaw[i + 1]
				}

				songList[+song[1]] = song
			})

			result.levels = gjData[0]
				.split('|')
				.map((lvl) => {
					const levelRaw = lvl.split(':')
					const levelData: LevelRaw = {}
					for (let i = 0; i < levelRaw.length; i += 2) {
						levelData[+levelRaw[i]] = levelRaw[i + 1]
					}
					return levelData
				})
				.map((lvl) => new Level(lvl, authorList[+lvl[6]] ?? [+lvl[6]], songList[+lvl[35]] ?? []))
				.filter((lvl) => lvl !== null)

			return result
		} catch (e) {
			console.error(e)
			return GDServer.error()
		}
	}

	static async fetchAwarded(page: number = 0, filter: GDFilter = {}): Promise<SearchResult> {
		return GDServer.fetchFromGD({
			type: 11,
			page,
			...filter,
		})
	}

	static async fetchList(list: number[] = [], filter: GDFilter = {}): Promise<SearchResult> {
		if (!list.length) return GDServer.error()

		return GDServer.fetchFromGD({
			type: 10,
			str: list.slice(0, GDServer.maxListLength).join(','),
			...filter,
		})
	}
}
