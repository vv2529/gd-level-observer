import http from 'http'
import { GDFilter } from '../interfaces.js'

export const timestamp = (): string => new Date().toString().slice(0, 24)

export const sleep = (seconds: number): Promise<any> => {
	return new Promise((resolve) => {
		setTimeout(resolve, seconds * 1000)
	})
}

export const getRandomInterval = ({ period, random }: { period: number; random: number }): number =>
	period + (Math.random() - 0.5) * 2 * random

export const tryCatch = async <T>(resolve: () => Promise<T>, fallback: T): Promise<T> => {
	try {
		return await resolve()
	} catch (e) {
		console.error(e)
		return fallback
	}
}

export const createRequestBody = (filter: GDFilter): string => {
	const result = new URLSearchParams()

	for (const [key, value] of Object.entries(filter)) {
		result.append(key, value)
	}

	return result.toString()
}

const _httpFetch = (
	url: string,
	params: http.RequestOptions = {},
	body: string,
	resolve: (value: string) => void,
	reject: (error?: any) => void
): void => {
	const urlObject = new URL(url)
	const options: http.RequestOptions = {
		host: urlObject.host,
		path: urlObject.pathname,
		headers: { Accept: '*/*', 'Content-Type': 'application/x-www-form-urlencoded' },
		...params,
	}

	const callback = (response: http.IncomingMessage) => {
		let str: string = ''

		response.on('data', (chunk: string) => {
			str += chunk
		})

		response.on('end', () => {
			resolve(str)
		})
	}

	const req = http.request(options, callback)

	req.on('error', (e: Error) => {
		reject(e)
	})

	req.write(body)
	req.end()
}

export const httpFetch = (
	url: string,
	params: http.RequestOptions = {},
	body: string
): Promise<string> => {
	return new Promise((resolve, reject) => _httpFetch(url, params, body, resolve, reject))
}
