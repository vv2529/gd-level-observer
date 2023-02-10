import express from 'express'
import { asyncWrapper } from '../../functions.js'
import controller from '../controllers/level.js'

const router = express.Router()

router.route('/:id').get(asyncWrapper(controller.get))
router.route('/').get(asyncWrapper(controller.get))
router.route('/').post(asyncWrapper(controller.post))

export default router
