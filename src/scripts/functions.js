import http from 'http'

export const timestamp = () => new Date().toString().slice(0, 24)

export const sleep = (seconds) => {
	return new Promise((resolve) => {
		setTimeout(resolve, seconds * 1000)
	})
}

export const getRandomInterval = ({ period, random }) => period + (Math.random() - 0.5) * 2 * random

export const tryCatch = async (f) => {
	try {
		return await f()
	} catch (e) {
		console.error(e)
	}
}

export const createRequestBody = (filter) => {
	const result = new URLSearchParams()

	for (const [key, value] of Object.entries(filter)) {
		result.append(key, value)
	}

	return result.toString()
}

const _httpFetch = (url, params = {}, resolve, reject) => {
	const urlObject = new URL(url)
	const options = {
		host: urlObject.host,
		path: urlObject.pathname,
		headers: { Accept: '*/*', 'Content-Type': 'application/x-www-form-urlencoded' },
		...params,
	}
	if (options.body) delete options.body

	const callback = (response) => {
		let str = ''

		response.on('data', (chunk) => {
			str += chunk
		})

		response.on('end', () => {
			resolve(str)
		})
	}

	const req = http.request(options, callback)

	req.on('error', (e) => {
		reject(e)
	})

	req.write(params.body)
	req.end()
}

export const httpFetch = (...args) => {
	return new Promise((resolve, reject) => _httpFetch(...args, resolve, reject))
}
