import { tryCatch } from '../scripts/functions.js'
import { CreatorModel, LevelModel, SongModel } from '../models.js'
import Level from '../class/Level.js'
import { FindOptions, Op } from 'sequelize'
import SongStorage from './Songs.js'
import CreatorStorage from './Creators.js'

export default class LevelStorage {
	static readonly common: FindOptions = {
		include: [
			{
				model: CreatorModel,
				as: 'author',
				attributes: CreatorStorage.common.attributes,
			},
			{
				model: SongModel,
				as: 'song',
				attributes: SongStorage.common.attributes,
			},
		],
	}

	static async add(levels: Level[]) {
		if (!levels.length) return

		await tryCatch(async () => {
			await LevelModel.bulkCreate(levels, {
				updateOnDuplicate: [
					'name',
					'playerID',
					'description',
					'downloads',
					'likes',
					'cp',
					'stars',
					'coins',
					'verifiedCoins',
					'length',
					'demonDifficulty',
					'gameVersion',
					'version',
					'copiedID',
					'twoPlayer',
					'starsRequested',
					'objects',
					'songID',
					'updatedAt',
				],
			})
		}, null)
	}

	static async remove(id: number | number[]) {
		await tryCatch(async () => {
			await LevelModel.destroy({
				where: {
					id,
				},
			})
		}, null)
	}

	static async drop() {
		await tryCatch(async () => {
			await LevelModel.destroy({
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
			return await LevelModel.findByPk(id, this.common)
		}, null)
	}

	static async getOne(filter: FindOptions) {
		return await tryCatch(async () => {
			return await LevelModel.findOne({
				...filter,
				...this.common,
			})
		}, null)
	}

	static async get(filter: FindOptions) {
		return await tryCatch(async () => {
			return await LevelModel.findAll({
				...filter,
				...this.common,
			})
		}, [])
	}

	static async count(filter: FindOptions) {
		return await tryCatch(async () => {
			return await LevelModel.count(filter)
		}, 0)
	}
}
