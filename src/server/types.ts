import { Request, Response } from 'express'

export type AsyncFinalHandler = (req: Request, res: Response) => Promise<void>

export interface SentCreator {
	playerID: number
	name: string
	accountID?: number
}

export interface SentSong {
	id: number
	name: string
	artist: string
	artistID?: number
	size?: string
	link?: string
	videoID?: string
	youtubeURL?: string
	isVerified?: boolean
	songPriority?: number
	custom: boolean
}

export interface SentLevel {
	id: number
	name: string
	// playerID?: number
	description: string
	difficulty?: string
	downloads: number
	likes: number
	cp: number
	stars: number
	coins: number
	verifiedCoins: boolean
	length: number | string
	demonDifficulty: number
	// gameVersion?: number
	updatedInGameVersion: string
	releasedInGameVersion: string
	version: number
	copiedID: number
	twoPlayer: boolean
	starsRequested: number
	objects: number
	// songID?: number
	author: SentCreator
	song: SentSong
	refreshedAt?: Date
}
