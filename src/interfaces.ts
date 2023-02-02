import Level from './class/Level.js'

export interface GDFilter {
	secret?: string
	gameVersion?: number
	binaryVersion?: number
	gdw?: 0 | 1
	star?: 0 | 1
	len?: string
	total?: number
	uncompleted?: 0 | 1
	onlyCompleted?: 0 | 1
	featured?: 0 | 1
	original?: 0 | 1
	twoPlayer?: 0 | 1
	coins?: 0 | 1
	epic?: 0 | 1
	str?: string
	type?: number
	page?: number
	count?: number
}

export interface SearchResult {
	total: number
	offset: number
	levels: Level[]
	result: 'success' | 'error' | 'block'
}

export type AuthorRaw = string[]
export type SongRaw = { [key: number]: string }
export type LevelRaw = { [key: number]: string }

export type Updates = { [key: string]: string[] }
