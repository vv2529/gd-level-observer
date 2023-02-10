import { Handler, Response } from 'express'
import { AsyncFinalHandler } from './types.js'

// We create a wrapper to workaround async errors not being transmitted correctly.
export const asyncWrapper = (handler: AsyncFinalHandler): Handler => {
	return async (req, res, next) => {
		try {
			await handler(req, res)
		} catch (error) {
			next(error)
		}
	}
}

export const badRequest = (res: Response, msg: string) => {
	res.status(400).end(msg)
}
