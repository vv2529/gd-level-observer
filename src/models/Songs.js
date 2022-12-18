import { tryCatch } from '../scripts/functions.js'
import { SongsModel } from '../models.js'
import officialSongs from '../data/officialSongs.json' assert { type: 'json' }

export default class Songs {
	static Model = SongsModel

	static async add(song) {
		return await tryCatch(async () => {
			return await Songs.Model.findOrCreate({
				where: {
					id: song.id,
				},
				defaults: song,
			})
		})
	}

	static async update(song) {
		return await tryCatch(async () => {
			return await Songs.Model.update(song, {
				where: {
					id: song.id,
				},
			})
		})
	}

	static async remove(id) {
		await tryCatch(async () => {
			await Songs.Model.destroy({
				where: {
					id,
				},
			})
		})
	}

	static async getByID(id) {
		return await tryCatch(async () => {
			return await Songs.Model.findByPk(id)
		})
	}

	static async get(filter) {
		return await tryCatch(async () => {
			return await Songs.Model.findAll(filter)
		})
	}

	static async setupOfficialSongs() {
		await tryCatch(async () => {
			await Songs.Model.bulkCreate(Songs.officialSongs, {
				updateOnDuplicate: [...Object.keys(Songs.officialSongs[0]), 'updatedAt'],
			})
		})
	}
}

const setupOfficialSongs = async () => {
	const artistIDs = officialSongs.reduce((result, [name, artist]) => {
		if (!result.includes(artist)) result.push(artist)
		return result
	}, [])

	Songs.officialSongs = officialSongs.map(([name, artist], i) => ({
		id: -i,
		name,
		artistID: -artistIDs.indexOf(artist),
		artist,
	}))
}

setupOfficialSongs()
