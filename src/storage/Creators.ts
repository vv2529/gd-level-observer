import { tryCatch } from '../scripts/functions.js'
import { CreatorModel } from '../models.js'
import Creator from '../class/Creator.js'
import { FindOptions, Op } from 'sequelize'

export default class CreatorStorage {
	static Model = CreatorModel

	static async add(creator: Creator | undefined): Promise<[Creator, boolean]> {
		if (creator === undefined) return [Creator.fallback, false]
		return await tryCatch(async (): Promise<[Creator, boolean]> => {
			return await CreatorStorage.Model.findOrCreate({
				where: {
					playerID: creator.playerID,
				},
				defaults: creator,
			})
		}, [Creator.fallback, false])
	}

	static async update(creator: Creator) {
		return await tryCatch(async () => {
			return await CreatorStorage.Model.update(creator, {
				where: {
					playerID: creator.playerID,
				},
			})
		}, [0])
	}

	static async remove(playerID: number | number[]) {
		await tryCatch(async () => {
			await CreatorStorage.Model.destroy({
				where: {
					playerID,
				},
			})
		}, null)
	}

	static async drop() {
		await tryCatch(async () => {
			await CreatorStorage.Model.destroy({
				where: {
					playerID: {
						[Op.gt]: -99, // essentially -Infinity
					},
				},
			})
		}, null)
	}

	static async getByID(playerID: number): Promise<Creator> {
		return await tryCatch(async () => {
			return (await CreatorStorage.Model.findByPk(playerID)) || Creator.fallback
		}, Creator.fallback)
	}

	static async get(filter: FindOptions): Promise<Creator[]> {
		return await tryCatch(async () => {
			return await CreatorStorage.Model.findAll(filter)
		}, [])
	}
}
