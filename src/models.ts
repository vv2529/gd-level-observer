import env from './config/dev.env.json' assert { type: 'json' }
import {
	Sequelize,
	Model,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	NonAttribute,
	DataTypes,
	ForeignKey,
} from 'sequelize'
import Creator from './class/Creator.js'
import Song from './class/Song.js'
import Level from './class/Level.js'

const sequelize = new Sequelize(env.mysql.database, env.mysql.user, env.mysql.password, {
	host: env.mysql.host,
	dialect: 'mysql',
	logging: false,
})

interface hasTimestamps {
	createdAt?: CreationOptional<Date>
	updatedAt?: CreationOptional<Date>
}

export interface SavedCreator
	extends Model<InferAttributes<SavedCreator>, InferCreationAttributes<SavedCreator>>,
		Creator,
		hasTimestamps {}

export interface SavedSong
	extends Model<InferAttributes<SavedSong>, InferCreationAttributes<SavedSong>>,
		Song,
		hasTimestamps {}

export interface SavedLevel
	extends Model<InferAttributes<SavedLevel>, InferCreationAttributes<SavedLevel>>,
		Level,
		hasTimestamps {
	playerID: ForeignKey<SavedCreator['playerID']>
	songID: ForeignKey<SavedSong['id']>
	author: NonAttribute<SavedCreator>
	song: NonAttribute<SavedSong>
}

export const CreatorModel = sequelize.define<SavedCreator>('Creator', {
	playerID: {
		type: DataTypes.INTEGER,
		unique: true,
		primaryKey: true,
	},
	name: DataTypes.STRING,
	accountID: DataTypes.INTEGER,
})

export const SongModel = sequelize.define<SavedSong>('Song', {
	id: {
		type: DataTypes.INTEGER,
		unique: true,
		primaryKey: true,
	},
	name: DataTypes.STRING,
	artistID: DataTypes.INTEGER,
	artist: DataTypes.STRING,
	size: DataTypes.STRING,
	link: DataTypes.STRING,
	videoID: DataTypes.STRING,
	youtubeURL: DataTypes.STRING,
	isVerified: DataTypes.BOOLEAN,
	songPriority: DataTypes.INTEGER,
})

export const LevelModel = sequelize.define<SavedLevel>('Level', {
	id: {
		type: DataTypes.INTEGER,
		unique: true,
		primaryKey: true,
	},
	name: DataTypes.STRING,
	playerID: {
		type: DataTypes.NUMBER,
		references: 'creators',
	},
	description: DataTypes.TEXT,
	downloads: DataTypes.INTEGER,
	likes: DataTypes.INTEGER,
	cp: DataTypes.INTEGER,
	stars: DataTypes.INTEGER,
	coins: DataTypes.INTEGER,
	verifiedCoins: DataTypes.BOOLEAN,
	length: DataTypes.INTEGER,
	demonDifficulty: DataTypes.INTEGER,
	gameVersion: DataTypes.INTEGER,
	version: DataTypes.INTEGER,
	copiedID: DataTypes.INTEGER,
	twoPlayer: DataTypes.BOOLEAN,
	starsRequested: DataTypes.INTEGER,
	objects: DataTypes.INTEGER,
	songID: {
		type: DataTypes.NUMBER,
		references: 'songs',
	},
})

LevelModel.belongsTo(CreatorModel, { as: 'author', foreignKey: { name: 'playerID' } })
LevelModel.belongsTo(SongModel, { as: 'song', foreignKey: { name: 'songID' } })

export const syncModels = async (): Promise<any> =>
	Promise.all([CreatorModel.sync(), SongModel.sync(), LevelModel.sync()])
