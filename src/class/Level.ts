import { AuthorRaw, LevelRaw, SongRaw } from '../interfaces.js'
import Creator from './Creator.js'
import Song from './Song.js'

export default class Level {
	declare id: number
	declare name: string
	declare playerID: number
	declare description: string
	declare downloads: number
	declare likes: number
	declare cp: number
	declare stars: number
	declare coins: number
	declare verifiedCoins: boolean
	declare length: number
	declare demonDifficulty: number
	declare gameVersion: number
	declare version: number
	declare copiedID: number
	declare twoPlayer: boolean
	declare starsRequested: number
	declare objects: number
	declare songID: number
	declare author: Creator
	declare song: Song

	constructor(lvl: LevelRaw, author: AuthorRaw, song: SongRaw) {
		const creatorPoints: number = +(+lvl[18] > 0) + +(+lvl[19] > 0) + +(+lvl[42] > 0)

		this.id = +lvl[1]
		this.name = lvl[2]
		this.playerID = +lvl[6]
		this.description = Buffer.from(lvl[3] || '', 'base64').toString() || ''
		this.downloads = +lvl[10]
		this.likes = +lvl[14]
		this.cp = creatorPoints
		this.stars = +lvl[18]
		this.coins = +lvl[37]
		this.verifiedCoins = +lvl[38] > 0
		this.length = +lvl[15]
		this.demonDifficulty = +lvl[18] === 10 ? Level.demonDifficultiyIDs.indexOf(+lvl[43]) + 1 : 0
		this.gameVersion = +lvl[13]
		this.version = +lvl[5]
		this.copiedID = +lvl[30]
		this.twoPlayer = !!+lvl[31]
		this.starsRequested = +lvl[39]
		this.objects = +lvl[45]
		this.songID = +lvl[35] > 0 ? +lvl[35] : -lvl[12] - 2
		this.author = {
			playerID: +author[0],
			name: author[1] || '-',
			accountID: +author[2] || 0,
		}
		this.song =
			+lvl[35] > 0
				? {
						id: +song[1],
						name: song[2],
						artistID: +song[3],
						artist: song[4],
						size: song[5],
						link: decodeURIComponent(song[10]),
						videoID: song[6],
						youtubeURL: song[7],
						isVerified: !!song[8],
						songPriority: +song[9] || 0,
				  }
				: Song.officialSongs[~this.songID]
	}

	static readonly demonDifficultiyIDs = [3, 4, 0, 5, 6]
	static readonly demonDifficultiyNames = ['Easy', 'Medium', 'Hard', 'Insane', 'Extreme']

	static getDifficultyText(level: Level): string {
		switch (level.stars) {
			case 1:
				return 'Auto'
			case 2:
				return 'Easy'
			case 3:
				return 'Normal'
			case 4:
			case 5:
				return 'Hard'
			case 6:
			case 7:
				return 'Harder'
			case 8:
			case 9:
				return 'Insane'
			case 10:
				return `${this.demonDifficultiyNames[level.demonDifficulty - 1]} Demon`
		}
		return ''
	}

	static readonly lengthTexts = ['Tiny', 'Short', 'Medium', 'Long', 'XL']

	static getLengthText(length: number): string {
		return this.lengthTexts[length] || ''
	}

	static readonly firstIDs: { [key: string]: number } = {
		'1.0': 0,
		'1.1': 3883,
		'1.2': 13993,
		'1.3': 66608,
		'1.4': 123247,
		'1.5': 184440,
		'1.6': 423950,
		'1.7': 835854,
		'1.8': 1629780,
		'1.9': 2808394,
		'2.0': 11045512,
		'2.1': 28360554,
	}
	private static readonly versions = Object.keys(this.firstIDs).reverse()

	static getVersionByID(id: number): string {
		for (let version of this.versions) {
			if (id >= this.firstIDs[version]) return version
		}
		return 'unknown'
	}

	static getIngameVersion(version: number): string {
		if (version > 17) return (version / 10).toFixed(1)
		else if (version == 11) return '1.8'
		else if (version == 10) return '1.7'
		else if (version >= 1 && version <= 7) return '1.' + (version - 1)
		else return `unknown (version #${version})`
	}

	static getBasicString(level: Level): string {
		return `${level.name} by ${level.author.name} (${level.id})`
	}
}
