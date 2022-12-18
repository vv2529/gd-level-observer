import env from '../config/dev.env.json' assert { type: 'json' }
import { Sequelize } from 'sequelize'

const sequelize = new Sequelize(env.mysql.database, env.mysql.user, env.mysql.password, {
	host: env.mysql.host,
	dialect: 'mysql',
	logging: false,
})

export const CreatorsModel = sequelize.define('Creator', {
	playerID: {
		type: Sequelize.INTEGER,
		unique: true,
		primaryKey: true,
	},
	name: Sequelize.STRING,
	accountID: Sequelize.INTEGER,
})

export const SongsModel = sequelize.define('Song', {
	id: {
		type: Sequelize.INTEGER,
		unique: true,
		primaryKey: true,
	},
	name: Sequelize.STRING,
	artistID: Sequelize.INTEGER,
	artist: Sequelize.STRING,
	size: Sequelize.STRING,
	link: Sequelize.STRING,
	videoID: Sequelize.STRING,
	youtubeURL: Sequelize.STRING,
	isVerified: Sequelize.BOOLEAN,
	songPriority: Sequelize.INTEGER,
})

export const LevelsModel = sequelize.define('Level', {
	id: {
		type: Sequelize.INTEGER,
		unique: true,
		primaryKey: true,
	},
	name: Sequelize.STRING,
	playerID: {
		type: Sequelize.INTEGER,
		references: {
			model: CreatorsModel,
			key: 'playerID',
		},
	},
	description: Sequelize.TEXT,
	downloads: Sequelize.INTEGER,
	likes: Sequelize.INTEGER,
	cp: Sequelize.INTEGER,
	stars: Sequelize.INTEGER,
	coins: Sequelize.INTEGER,
	verifiedCoins: Sequelize.BOOLEAN,
	length: Sequelize.INTEGER,
	demonDifficulty: Sequelize.INTEGER,
	gameVersion: Sequelize.STRING,
	version: Sequelize.INTEGER,
	copiedID: Sequelize.INTEGER,
	twoPlayer: Sequelize.BOOLEAN,
	starsRequested: Sequelize.INTEGER,
	objects: Sequelize.INTEGER,
	songID: {
		type: Sequelize.INTEGER,
		references: {
			model: SongsModel,
			key: 'id',
		},
	},
})

export const syncModels = async () =>
	Promise.all([CreatorsModel.sync(), SongsModel.sync(), LevelsModel.sync()])
