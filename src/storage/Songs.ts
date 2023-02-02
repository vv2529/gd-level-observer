import { tryCatch } from '../scripts/functions.js'
import { SongModel } from '../models.js'
import { FindOptions, Op } from 'sequelize'
import Song from '../class/Song.js'

export default class SongStorage {
	static Model = SongModel

	static async add(song: Song | undefined): Promise<[Song, boolean]> {
		if (song === undefined) return [Song.fallback, false]
		return await tryCatch(async (): Promise<[Song, boolean]> => {
			return await SongStorage.Model.findOrCreate({
				where: {
					id: song.id,
				},
				defaults: song,
			})
		}, [Song.fallback, false])
	}

	static async update(song: Song) {
		return await tryCatch(async () => {
			return await SongStorage.Model.update(song, {
				where: {
					id: song.id,
				},
			})
		}, [0])
	}

	static async remove(id: number | number[]) {
		await tryCatch(async () => {
			await SongStorage.Model.destroy({
				where: {
					id,
				},
			})
		}, null)
	}

	static async drop() {
		await tryCatch(async () => {
			await SongStorage.Model.destroy({
				where: {
					id: {
						[Op.gt]: -99, // essentially -Infinity
					},
				},
			})
		}, null)
	}

	static async getByID(id: number): Promise<Song> {
		return await tryCatch(async () => {
			return (await SongStorage.Model.findByPk(id)) || Song.fallback
		}, Song.fallback)
	}

	static async get(filter: FindOptions): Promise<Song[]> {
		return await tryCatch(async () => {
			return await SongStorage.Model.findAll(filter)
		}, [])
	}

	static async setupOfficialSongs() {
		await tryCatch(async () => {
			await SongStorage.Model.bulkCreate(Song.officialSongs)
		}, null)
	}
}
