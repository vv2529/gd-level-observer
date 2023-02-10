import { tryCatch } from '../scripts/functions.js'
import { SongModel } from '../models.js'
import { FindOptions, Op } from 'sequelize'
import Song from '../class/Song.js'

export default class SongStorage {
	static readonly common: FindOptions = {}

	static async add(songs: Song[]) {
		if (!songs.length) return

		return await tryCatch(async () => {
			return await SongModel.bulkCreate(songs, {
				updateOnDuplicate: [
					'name',
					'artistID',
					'artist',
					'size',
					'link',
					'videoID',
					'youtubeURL',
					'isVerified',
					'songPriority',
					'updatedAt',
				],
			})
		}, null)
	}

	static async remove(id: number | number[]) {
		await tryCatch(async () => {
			await SongModel.destroy({
				where: {
					id,
				},
			})
		}, null)
	}

	static async drop() {
		await tryCatch(async () => {
			await SongModel.destroy({
				where: {
					id: {
						[Op.gt]: -99, // essentially -Infinity
					},
				},
			})
		}, null)
	}

	static async getByID(id: number) {
		return await tryCatch(async () => {
			return (await SongModel.findByPk(id, this.common)) || Song.fallback
		}, Song.fallback)
	}

	static async get(filter: FindOptions) {
		return await tryCatch(async () => {
			return await SongModel.findAll({
				...filter,
				...this.common,
			})
		}, [])
	}

	static async count(filter: FindOptions) {
		return await tryCatch(async () => {
			return await SongModel.count(filter)
		}, 0)
	}

	static async setupOfficialSongs() {
		await tryCatch(async () => {
			await SongModel.bulkCreate(Song.officialSongs)
		}, null)
	}
}
