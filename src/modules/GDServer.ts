import config from '../config/settings.json' assert { type: 'json' }
import Level from '../class/Level.js'
import { createRequestBody, httpFetch } from '../scripts/functions.js'

export default class GDServer {
	static defaultParams = {
		secret: 'Wmfd2893gb7',
		gameVersion: 21,
		binaryVersion: 35,
		gdw: 0,
		star: 1,
	}

	static maxListLength = 1000

	static async fetchFromGD(filter) {
		filter = Object.assign({}, GDServer.defaultParams, filter)

		try {
			let rawData = await httpFetch(config.gd_server_search.url, {
				method: 'POST',
				body: createRequestBody(filter),
			})

			if (rawData.startsWith('<br />')) {
				rawData = rawData.split('<br />').slice(2).join('<br />').trim()
			}
			if (!rawData) {
				return { total: 0, offset: 0, levels: [], result: 'block' }
			}
			if (rawData == '-1') {
				return { total: 0, offset: 0, levels: [], result: 'error' }
			}

			const gjData = rawData.split('#')
			const pageInfo = gjData[3].split(':')

			const result = { total: +pageInfo[0], offset: +pageInfo[1], result: 'success', levels: [] }
			if (!gjData[0]) return result

			const authors = gjData[1].split('|'),
				authorList = {}
			authors.forEach((x) => {
				if (x.startsWith('~')) return
				const author = x.split(':')
				authorList[+author[0]] = author
			})

			const songs = `~${gjData[2]}~`.split(':'),
				songList = {}
			songs.forEach((x) => {
				const songRaw = x.slice(1, -1).split('~|~')
				let song = {}
				for (let i = 0; i < songRaw.length; i += 2) {
					song[+songRaw[i]] = songRaw[i + 1]
				}

				songList[+song[1]] = song
			})

			result.levels = gjData[0]
				.split('|')
				.map((lvl) => {
					const levelRaw = lvl.split(':')
					let levelData = {}
					for (let i = 0; i < levelRaw.length; i += 2) {
						levelData[+levelRaw[i]] = levelRaw[i + 1]
					}
					return levelData
				})
				.map((lvl) => new Level(lvl, authorList[+lvl[6]] ?? [+lvl[6]], songList[+lvl[35]] ?? []))
				.filter((lvl) => lvl != null)

			return result
		} catch (e) {
			console.error(e)
			return { total: 0, offset: 0, levels: [], result: 'error' }
		}
	}

	static async fetchAwarded(page = 0, filter = {}) {
		return GDServer.fetchFromGD({
			type: 11,
			page,
			...filter,
		})
	}

	static async fetchList(list = [], filter = {}) {
		if (!list.length) return []

		return GDServer.fetchFromGD({
			type: 10,
			str: list.slice(0, GDServer.maxListLength).join(','),
			...filter,
		})
	}
}
