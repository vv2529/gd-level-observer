import express, { Router } from 'express'
import { syncModels } from '../models.js'
import levelRouter from './api/routers/level.js'
import playerRouter from './api/routers/player.js'
import songRouter from './api/routers/song.js'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.get('/', (req, res) => {
	res.send('GD Level Observer API!')
})

const routes: { [route: string]: Router } = {
	level: levelRouter,
	player: playerRouter,
	song: songRouter,
}

for (const [route, router] of Object.entries(routes)) {
	app.use(`/api/${route}`, router)
}

const start = async () => {
	await syncModels()
	app.listen(5000, () => {
		console.log('API server is listening on port 5000...')
	})
}

start()
