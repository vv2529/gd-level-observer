import { tryCatch } from '../scripts/functions.js'
import { CreatorsModel } from '../models.js'

export default class Creators {
	static Model = CreatorsModel

	static async add(creator) {
		return await tryCatch(async () => {
			return await Creators.Model.findOrCreate({
				where: {
					playerID: creator.playerID,
				},
				defaults: creator,
			})
		})
	}

	static async update(creator) {
		return await tryCatch(async () => {
			return await Creators.Model.update(creator, {
				where: {
					playerID: creator.playerID,
				},
			})
		})
	}

	static async remove(playerID) {
		await tryCatch(async () => {
			await Creators.Model.destroy({
				where: {
					playerID,
				},
			})
		})
	}

	static async getByID(playerID) {
		return await tryCatch(async () => {
			return await Creators.Model.findByPk(playerID)
		})
	}

	static async get(filter) {
		return await tryCatch(async () => {
			return await Creators.Model.findAll(filter)
		})
	}
}
