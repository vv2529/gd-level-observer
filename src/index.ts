import GDServer from './modules/GDServer.js'
import CreatorStorage from './storage/Creators.js'
import SongStorage from './storage/Songs.js'
import LevelStorage from './storage/Levels.js'
import { SavedCreator, SavedLevel, SavedSong, syncModels } from './models.js'
import { Op } from 'sequelize'
import config from './config/settings.json' assert { type: 'json' }
import { getRandomInterval, sleep, timestamp } from './scripts/functions.js'
import Level from './class/Level.js'
import Discord from './modules/Discord.js'
import { SearchResult, Updates } from './interfaces.js'
import Song from './class/Song.js'
import Creator from './class/Creator.js'

class LevelObserver {
	static log(...args: any[]) {
		console.log(`[${timestamp()}]`, ...args)
	}
	log(...args: any[]) {
		LevelObserver.log(...args)
	}

	savedIDs: number[] = []
	lastUpdatedID: number = 0

	static async fetchList(list: number[]): Promise<Level[]> {
		if (!list.length) return []

		const levels: Level[] = []
		const size: number = list.length
		const batchSize: number = config.gd_server_search.known_levels.batch_size
		const batchCount: number = Math.ceil(size / batchSize)

		this.log(`Fetching a list of ${size} levels in ${batchCount} pages... Page:`)

		for (let i = 0; i < batchCount; i++) {
			console.log(`${i}...`)
			const result: SearchResult = await GDServer.fetchList(
				list.slice(i * batchSize, (i + 1) * batchSize)
			)
			levels.push(...result.levels)
			await LevelObserver.checkAndSave(result.levels)
			if (result.result !== 'success') break

			if (i < batchCount - 1)
				await sleep(getRandomInterval(config.gd_server_search.known_levels.next_page))
		}

		console.log('Done.')
		return levels
	}

	async fetchAwarded(from: number = 0, to: number = Infinity): Promise<Level[]> {
		this.log('Fetching awarded levels... Page:')

		let page: number = from,
			allNew: boolean,
			noResponse: boolean
		const fetchedIDs: number[] = [],
			fetched: Level[] = []

		do {
			if (page > from) {
				await sleep(getRandomInterval(config.gd_server_search.new_levels.next_page))
			}

			console.log(`${page}...`)
			const result: SearchResult = await GDServer.fetchAwarded(page)
			const newLevels: Level[] = result.levels.filter(
				(level: Level) => !this.savedIDs.includes(level.id)
			)
			fetched.push(...newLevels)
			fetchedIDs.push(...newLevels.map(({ id }) => id))
			allNew = newLevels.length === result.levels.length
			noResponse = result.levels.length === 0
			if (noResponse) this.log('Awarded returned no levels')

			await LevelObserver.checkAndSave(newLevels)
			if (result.result !== 'success') break
			page++
		} while (!noResponse && allNew && page < to)

		this.savedIDs.push(...fetchedIDs)
		console.log('Done.')
		return fetched
	}

	async fetchAwardedLoop(): Promise<void> {
		await sleep(getRandomInterval(config.gd_server_search.new_levels) * 60)
		await this.fetchAwarded()
		this.fetchAwardedLoop()
	}

	async update(): Promise<void> {
		this.log('Updating...')
		const count = config.gd_server_search.known_levels.batch_size
		const saved: SavedLevel[] = await LevelStorage.get({
			where: {
				id: {
					[Op.gte]: this.lastUpdatedID,
				},
			},
			limit: count,
		})
		const levelIDs: number[] = saved.map(({ id }) => id)
		const levels: Level[] = await LevelObserver.fetchList(levelIDs)

		if (levels.length === 0) {
			this.log('Level update failed')
			return
		}
		const [unrated, updates] = await this.compare(saved, levels)

		await LevelStorage.remove(unrated.map(({ id }) => id))
		this.nextStartingLevel()
		LevelObserver.logUpdates(updates)
	}

	async updateLoop(): Promise<void> {
		await sleep(getRandomInterval(config.gd_server_search.known_levels) * 60)
		await this.update()
		this.updateLoop()
	}

	static logUpdates(updates: Updates) {
		const msg = Discord.composeMessage(updates)
		msg ? console.log(msg) : this.log('No updates detected.')
	}

	async compare(oldLevels: SavedLevel[], newLevels: Level[]): Promise<[SavedLevel[], Updates]> {
		const receivedIDs: number[] = newLevels.map(({ id }) => id),
			savedObj: { [key: number]: SavedLevel } = Object.fromEntries(
				oldLevels.map((level) => [level.id, level])
			),
			receivedObj: { [key: number]: Level } = Object.fromEntries(
				newLevels.map((level) => [level.id, level])
			),
			unrated: SavedLevel[] = oldLevels.filter((level) => !receivedIDs.includes(level.id)),
			updates: Updates = {
				'Levels unrated': [],
				'Verified coins': [],
				'Unverified coins': [],
				'Added silver coins': [],
				'Added bronze coins': [],
				'Removed silver coins': [],
				'Removed bronze coins': [],
				'Difficulty changed': [],
				'Rating changed': [],
				'Levels moved to another account': [],
				'Level name changed': [],
				'Level song changed': [],
			}

		updates['Levels unrated'] = unrated.map((level) => Level.getBasicString(level))

		for (let id in receivedObj) {
			const levelOld = savedObj[id],
				levelNew = receivedObj[id]

			if (!levelNew.stars) {
				unrated.push(levelOld)
				updates['Levels unrated'].push(Level.getBasicString(levelNew))
				continue
			}

			if (levelOld.verifiedCoins !== levelNew.verifiedCoins) {
				if (levelNew.verifiedCoins) updates['Verified coins'].push(Level.getBasicString(levelNew))
				else updates['Unverified coins'].push(Level.getBasicString(levelNew))
			}

			if (levelOld.coins !== levelNew.coins) {
				if (levelNew.coins > levelOld.coins) {
					if (levelNew.verifiedCoins)
						updates['Added silver coins'].push(
							`**+${levelNew.coins - levelOld.coins}** ${Level.getBasicString(levelNew)}`
						)
					else
						updates['Added bronze coins'].push(
							`**+${levelNew.coins - levelOld.coins}** ${Level.getBasicString(levelNew)}`
						)
				} else {
					if (levelNew.verifiedCoins)
						updates['Removed silver coins'].push(
							`**${levelNew.coins - levelOld.coins}** ${Level.getBasicString(levelNew)}`
						)
					else
						updates['Removed bronze coins'].push(
							`**${levelNew.coins - levelOld.coins}** ${Level.getBasicString(levelNew)}`
						)
				}
			}

			if (levelOld.stars !== levelNew.stars) {
				updates['Difficulty changed'].push(
					`${Level.getBasicString(levelNew)}: ${levelOld.stars}★ → ${levelNew.stars}★`
				)
			}

			if (levelOld.cp !== levelNew.cp) {
				updates['Rating changed'].push(
					`${Level.getBasicString(levelNew)}: ${levelOld.cp} cp → ${levelNew.cp} cp`
				)
			}

			if (levelOld.playerID !== levelNew.playerID) {
				updates['Levels moved to another account'].push(
					`${Level.getBasicString(levelOld)} → ${levelNew.author.name}`
				)
			}

			if (levelOld.name !== levelNew.name) {
				updates['Level name changed'].push(`${levelOld.name} → ${Level.getBasicString(levelNew)}`)
			}

			if (levelOld.songID !== levelNew.songID) {
				updates['Level song changed'].push(
					`${Level.getBasicString(levelNew)}: ${Song.getBasicString(
						levelOld.song
					)} → ${Song.getBasicString(levelNew.song)}`
				)
			}
		}

		return [unrated, updates]
	}

	async findStartingLevel(): Promise<void> {
		this.lastUpdatedID =
			(
				await LevelStorage.getOne({
					order: ['updatedAt', 'id'],
					attributes: ['id'],
				})
			)?.id || 0

		let index = this.savedIDs.indexOf(this.lastUpdatedID)
		if (index !== -1) {
			const batchSize: number = config.gd_server_search.known_levels.batch_size
			index = Math.floor(index / batchSize) * batchSize
			this.lastUpdatedID = this.savedIDs[index]
		}

		this.log('Updates will start from ID:', this.lastUpdatedID, `(index ${index})`)
	}

	nextStartingLevel(): void {
		const batchSize: number = config.gd_server_search.known_levels.batch_size
		let index = this.savedIDs.indexOf(this.lastUpdatedID)
		if (index === -1) {
			index = this.savedIDs.findIndex((id) => id > this.lastUpdatedID)
			if (index === -1) index = Infinity
		}

		let nextIndex = index + batchSize
		if (nextIndex >= this.savedIDs.length) nextIndex = 0
		this.lastUpdatedID = this.savedIDs[nextIndex]
		this.log('Next update will start from ID:', this.lastUpdatedID, `(index ${nextIndex})`)
	}

	static async checkSongsAndCreators(levels: Level[]): Promise<Updates> {
		const creatorMap: { [key: number]: Creator } = {}
		const songMap: { [key: number]: Song } = {}

		levels.forEach(({ author, song }) => {
			creatorMap[author.playerID] = { ...author }
			if (song.id > 0) songMap[song.id] = { ...song }
		})

		const creatorIDs: number[] = Object.keys(creatorMap).map((s) => +s)
		const songIDs: number[] = Object.keys(songMap).map((s) => +s)
		const creators: Creator[] = Object.values(creatorMap)
		const songs: Song[] = Object.values(songMap)

		const [oldCreators, oldSongs]: [SavedCreator[], SavedSong[]] = await Promise.all([
			CreatorStorage.get({
				where: { playerID: creatorIDs },
			}),
			SongStorage.get({
				where: { id: songIDs },
			}),
		])

		const newCreators: Creator[] = creators.filter(
			({ playerID }) => !oldCreators.find((old) => old.playerID === playerID)
		)
		const newSongs: Song[] = songs.filter(({ id }) => !oldSongs.find((old) => old.id === id))

		const updates: Updates = {
			"Creator's name changed": [],
			"Creator's accountID changed": [],
			"Creator's milestones": newCreators
				.filter(({ accountID }) => accountID)
				.map((creator) => `${creator.name} - first CP!`),
			'Song info changed': [],
			'Songs used for the first time': newSongs.map(
				(song) => `${song.id} - ${song.name} by ${song.artist}`
			),
		}

		await Promise.all([CreatorStorage.add(creators), SongStorage.add(songs)])

		oldCreators.forEach((oldData) => {
			const newData = creatorMap[oldData.playerID]

			if (oldData.name !== newData.name) {
				updates["Creator's name changed"].push(`${oldData.name} → ${newData.name}`)
			}

			if (oldData.accountID !== newData.accountID) {
				updates["Creator's accountID changed"].push(
					`${newData.name}: ${oldData.accountID} → ${newData.accountID}`
				)
			}
		})

		oldSongs.forEach((oldData) => {
			const newData = songMap[oldData.id]

			const trackedFields: (keyof Song)[] = [
				'name',
				'artistID',
				'artist',
				'size',
				'link',
				'videoID',
				'youtubeURL',
				'isVerified',
				'songPriority',
			]

			trackedFields.forEach((field) => {
				if (oldData[field] !== newData[field]) {
					updates['Song info changed'].push(
						`${oldData.id} ${field}: ${oldData[field]} → ${newData[field]}`
					)
				}
			})
		})

		return updates
	}

	static async checkAndSave(levels: Level[]) {
		if (!levels.length) return
		const updates = await LevelObserver.checkSongsAndCreators(levels)
		// this.logUpdates(updates)
		await LevelStorage.add(levels)
	}

	async setup() {
		const isSetup: boolean = !!(await SongStorage.getByID(-1)).id
		if (!isSetup) {
			this.log('Initializing...')
			await SongStorage.setupOfficialSongs()
			if (config.initial_load) {
				this.log('Loading initial levels from file...')
				try {
					this.savedIDs = (
						await import(`./data/local/${config.initial_load}`, {
							assert: { type: 'json' },
						})
					).default
				} catch (e) {
					this.log('Loading failed.')
				}
				await LevelObserver.fetchList(this.savedIDs)
			}
		}

		if (!this.savedIDs.length)
			this.savedIDs = (await LevelStorage.get({ attributes: ['id'] })).map(({ id }) => id)
	}

	async reset() {
		await LevelStorage.drop()
		await Promise.all([(CreatorStorage.drop(), SongStorage.drop())])
		this.log('Deleted all levels, creators and songs!')
	}

	async normalStart() {
		await this.setup()
		await this.fetchAwarded()
		this.fetchAwardedLoop()
		await this.findStartingLevel()
		this.updateLoop()
	}

	async testStart() {
		// For use during development - put any code here
		await this.reset()
		await this.setup()
		await this.fetchAwarded(0, 10)
		// await this.update()
	}

	async start() {
		this.log(`Starting...`)

		await syncModels()
		// await this.testStart()
		await this.normalStart()
	}
}

const bot = new LevelObserver()

bot.start()
