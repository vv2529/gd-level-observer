import { tryCatch } from '../scripts/functions.js'
import { CreatorModel } from '../models.js'
import Creator from '../class/Creator.js'
import { FindOptions, Op } from 'sequelize'

export default class CreatorStorage {
	static readonly common: FindOptions = {}

	static async add(creators: Creator[]) {
		if (!creators.length) return

		return await tryCatch(async () => {
			return await CreatorModel.bulkCreate(creators, {
				updateOnDuplicate: ['name', 'accountID', 'updatedAt'],
			})
		}, null)
	}

	static async remove(playerID: number | number[]) {
		await tryCatch(async () => {
			await CreatorModel.destroy({
				where: {
					playerID,
				},
			})
		}, null)
	}

	static async drop() {
		await tryCatch(async () => {
			await CreatorModel.destroy({
				where: {
					playerID: {
						[Op.gt]: -99, // essentially -Infinity
					},
				},
			})
		}, null)
	}

	static async getByID(playerID: number) {
		return await tryCatch(async () => {
			return (await CreatorModel.findByPk(playerID, this.common)) || Creator.fallback
		}, Creator.fallback)
	}

	static async get(filter: FindOptions) {
		return await tryCatch(async () => {
			return await CreatorModel.findAll({
				...filter,
				...this.common,
			})
		}, [])
	}

	static async count(filter: FindOptions) {
		return await tryCatch(async () => {
			return await CreatorModel.count(filter)
		}, 0)
	}
}
