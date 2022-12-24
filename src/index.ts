import GDServer from './modules/GDServer.js'
import Creators from './models/Creators.js'
import Songs from './models/Songs.js'
import Levels from './models/Levels.js'
import { syncModels } from './models.js'
import { Op } from 'sequelize'
import config from './config/settings.json' assert { type: 'json' }
import { getRandomInterval, sleep, timestamp } from './scripts/functions.js'
import Level from './class/Level.js'
import Discord from './modules/Discord.js'

class LevelObserver {
	log(...args) {
		console.log(`[${timestamp()}]`, ...args)
	}

	savedIDs = []
	lastUpdatedID = 0

	static async fetchList(list) {
		const levels = []
		const size = list.length
		const batchSize = config.gd_server_search.known_levels.batch_size
		const batchCount = Math.ceil(size / batchSize)

		for (let i = 0; i < batchCount; i++) {
			const result = await GDServer.fetchList(list.slice(i * batchSize, (i + 1) * batchSize))
			levels.push(...result.levels)
			await LevelObserver.checkAndSave(result.levels)

			if (i < batchCount - 1)
				await sleep(getRandomInterval(config.gd_server_search.known_levels.next_page))
		}

		return levels
	}

	async fetchAwarded() {
		this.log('Fetching awarded levels...')

		let page = 0,
			allNew,
			noResponse
		const max = Infinity,
			startPage = page,
			fetchedIDs = []

		do {
			if (page > startPage) {
				await sleep(getRandomInterval(config.gd_server_search.new_levels.next_page))
			}

			const result = await GDServer.fetchAwarded(page)
			const newLevels = result.levels.filter((level) => !this.savedIDs.includes(level.id))
			fetchedIDs.push(...newLevels.map(({ id }) => id))
			allNew = newLevels.length === result.levels.length
			noResponse = result.levels.length === 0
			if (noResponse) this.log('Awarded returned no levels')

			LevelObserver.checkAndSave(newLevels)
			page++
		} while (!noResponse && allNew && page <= max)

		this.savedIDs.push(...fetchedIDs)
	}

	async fetchAwardedLoop() {
		await sleep(getRandomInterval(config.gd_server_search.new_levels) * 60)
		await this.fetchAwarded()
		this.fetchAwardedLoop()
	}

	async update() {
		this.log('Updating...')
		const count = config.gd_server_search.known_levels.batch_size
		const saved = await Levels.get({
			where: {
				id: {
					[Op.gte]: this.lastUpdatedID,
				},
			},
			limit: count,
		})
		const levelIDs = saved.map(({ id }) => id),
			levels = await LevelObserver.fetchList(levelIDs),
			receivedIDs = levels.map(({ id }) => id),
			savedObj = Object.fromEntries(saved.map((level) => [level.id, level])),
			receivedObj = Object.fromEntries(levels.map((level) => [level.id, level])),
			unrated = saved.filter((level) => !receivedIDs.includes(level.id)),
			updates = {
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
			}

		if (levels.length === 0) {
			this.log('Level update failed')
			return
		}

		const creatorsOfDeleted = await Promise.all(
			unrated.map((level) => Creators.getByID(level.playerID))
		)

		updates['Levels unrated'] = unrated.map((level, i) =>
			Level.getBasicString({
				...level.dataValues,
				author: creatorsOfDeleted[i],
			})
		)

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
				updates['Difficulty changed'].push(`${levelOld.stars}★ → ${Level.getBasicString(levelNew)}`)
			}

			if (levelOld.cp !== levelNew.cp) {
				updates['Rating changed'].push(`${levelOld.cp} cp → ${Level.getBasicString(levelNew)}`)
			}

			if (levelOld.playerID !== levelNew.playerID) {
				const authorOld = await Creators.getByID(levelOld.playerID)
				updates['Levels moved to another account'].push(
					`${authorOld.name} → ${Level.getBasicString(levelNew)}`
				)
			}

			if (levelOld.name !== levelNew.name) {
				updates['Level name changed'].push(`${levelOld.name} → ${Level.getBasicString(levelNew)}`)
			}
		}

		await Levels.remove(unrated.map(({ id }) => id))
		this.nextStartingLevel()
		console.log(Discord.composeMessage(updates))
	}

	async updateLoop() {
		await sleep(getRandomInterval(config.gd_server_search.known_levels) * 60)
		await this.update()
		this.updateLoop()
	}

	async findStartingLevel() {
		this.lastUpdatedID =
			(
				await Levels.getOne({
					order: ['updatedAt', 'id'],
				})
			)?.id || 0

		let index = this.savedIDs.indexOf(this.lastUpdatedID)
		if (index !== -1) {
			const batchSize = config.gd_server_search.known_levels.batch_size
			index = Math.floor(index / batchSize) * batchSize
			this.lastUpdatedID = this.savedIDs[index]
		}

		this.log('Updates will start from ID:', this.lastUpdatedID)
	}

	nextStartingLevel() {
		const batchSize = config.gd_server_search.known_levels.batch_size
		let index = this.savedIDs.indexOf(this.lastUpdatedID)
		if (index === -1) {
			index = this.savedIDs.findIndex((id) => id > this.lastUpdatedID)
			if (index === -1) index = Infinity
		}

		const nextIndex = index + batchSize
		this.lastUpdatedID = nextIndex >= this.savedIDs.length ? 0 : this.savedIDs[nextIndex]
		this.log('Next update will start from ID:', this.lastUpdatedID)
	}

	static async checkSongsAndCreators(levels) {
		const newSongs = [],
			newCreators = []

		await Promise.all(
			levels.map(async (level, i) => {
				const promises = []

				promises.push(Creators.add(level.author))

				if (level.song) {
					promises.push(Songs.add(level.song))
				}

				const [authorInfo, songInfo] = await Promise.all(promises)
				if (authorInfo[1]) newCreators.push(level.author)
				else if (authorInfo[0].name !== level.author.name) {
					Creators.update(level.author)
				}

				if (level.song) {
					if (songInfo[1]) newSongs.push(level.song)
					Object.keys(level.song).forEach((key) => {
						if (songInfo[0][key] !== level.song[key]) {
							Songs.update(level.song)
						}
					})
				}
			})
		)
	}

	static async checkAndSave(levels) {
		await LevelObserver.checkSongsAndCreators(levels)
		await Levels.add(levels)
	}

	async setup() {
		const isSetup = await Songs.getByID(0)
		if (!isSetup) {
			this.log('Initializing...')
			await Songs.setupOfficialSongs()
			if (config.initial_load) {
				this.log('Loading initial levels from file...')
				this.savedIDs = (
					await import(`../static/src/data/local/${config.initial_load}`, {
						assert: { type: 'json' },
					})
				).default
				await LevelObserver.fetchList(this.savedIDs)
			}
		}

		if (!this.savedIDs.length)
			this.savedIDs = (await Levels.get({ attributes: ['id'] })).map(({ id }) => id)

		await this.fetchAwarded()
	}

	async start() {
		this.log(`Starting...`)

		await syncModels()
		await this.setup()
		this.fetchAwardedLoop()
		await this.findStartingLevel()
		this.updateLoop()
	}
}

const bot = new LevelObserver()

bot.start()
