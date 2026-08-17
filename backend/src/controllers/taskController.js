import { Router } from 'express';
import { z } from 'zod';
import taskRepository from '../repositories/taskRepository.js';
import checkpointRepository from '../repositories/checkpointRepository.js';
import { ApiError, asyncRoute } from '../lib/workspaceApi.js';

const router = Router();
const statusSchema = z.enum(['inbox', 'ready', 'done']);
const referenceSchema = z.union([z.string().trim().url(), z.literal('')]);

const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(240),
  status: statusSchema.default('inbox'),
  order: z.number().int().nonnegative().optional(),
  referenceUrl: referenceSchema.optional(),
}).strict();

const updateTaskSchema = z.object({
  title: z.string().trim().min(1, 'title cannot be empty').max(240).optional(),
  status: statusSchema.optional(),
  order: z.number().int().nonnegative().optional(),
  referenceUrl: referenceSchema.optional(),
}).strict().refine((body) => Object.keys(body).length > 0, 'At least one task field is required');

router.get('/', asyncRoute(async (req, res) => {
  const status = req.query.status === undefined ? null : statusSchema.parse(req.query.status);
  res.json(await taskRepository.findAll(status));
}));

router.post('/', asyncRoute(async (req, res) => {
  const task = await taskRepository.create(createTaskSchema.parse(req.body));
  res.status(201).json(task);
}));

router.get('/:id/checkpoints', asyncRoute(async (req, res) => {
  const task = await taskRepository.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found', 'task_not_found');
  res.json(await checkpointRepository.findByTaskId(req.params.id));
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const task = await taskRepository.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found', 'task_not_found');
  res.json(task);
}));

router.patch('/:id', asyncRoute(async (req, res) => {
  const task = await taskRepository.update(req.params.id, updateTaskSchema.parse(req.body));
  if (!task) throw new ApiError(404, 'Task not found', 'task_not_found');
  res.json(task);
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const deleted = await taskRepository.delete(req.params.id);
  if (!deleted) throw new ApiError(404, 'Task not found', 'task_not_found');
  res.status(204).end();
}));

export default router;
