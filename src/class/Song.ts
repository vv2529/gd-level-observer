import officialSongs from '../data/officialSongs.json' assert { type: 'json' }

export default class Song {
	declare id: number
	declare name: string
	declare artistID: number
	declare artist: string
	declare size?: string
	declare link?: string
	declare videoID?: string
	declare youtubeURL?: string
	declare isVerified?: boolean
	declare songPriority?: number

	static readonly fallback: Song = {
		id: 0,
		name: '?',
		artistID: 0,
		artist: '?',
	}

	static readonly officialSongs: Song[] = []
}

const setupOfficialSongs = async () => {
	const artistIDs = officialSongs.reduce((result, [, artist]) => {
		if (!result.includes(artist)) result.push(artist)
		return result
	}, [])

	Song.officialSongs.push(
		...officialSongs.map(([name, artist], i) => ({
			id: -i - 1,
			name,
			artistID: -artistIDs.indexOf(artist) || 0,
			artist,
		}))
	)
}

setupOfficialSongs()
