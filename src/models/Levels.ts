import { tryCatch } from '../scripts/functions.js'
import { LevelsModel } from '../models.js'

export default class Levels {
	static Model = LevelsModel

	static async add(levels) {
		if (!levels.length) return

		await tryCatch(async () => {
			await Levels.Model.bulkCreate(levels, {
				updateOnDuplicate: [...Object.keys(levels[0]), 'updatedAt'],
			})
		})
	}

	static async remove(id) {
		await tryCatch(async () => {
			await Levels.Model.destroy({
				where: {
					id,
				},
			})
		})
	}

	static async getByID(id) {
		return await tryCatch(async () => {
			return await Levels.Model.findByPk(id)
		})
	}

	static async get(filter) {
		return await tryCatch(async () => {
			return await Levels.Model.findAll(filter)
		})
	}

	static async getOne(filter) {
		return await tryCatch(async () => {
			return await Levels.Model.findOne(filter)
		})
	}
}
