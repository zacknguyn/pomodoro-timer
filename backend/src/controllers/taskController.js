import { Router } from 'express';
import { z } from 'zod';
import taskRepository from '../repositories/taskRepository.js';
import checkpointRepository from '../repositories/checkpointRepository.js';
import pool from '../lib/db.js';
import { ApiError, asyncRoute } from '../lib/workspaceApi.js';

const router = Router();
const statusSchema = z.enum(['inbox', 'ready', 'progress', 'done']);
const referenceSchema = z.union([z.string().trim().url().max(2048).refine((value) => /^https?:\/\//i.test(value), 'Use an http or https reference'), z.literal('')]);
const taskDetails = {
  project: z.string().trim().max(160).optional(),
  nextStep: z.string().trim().max(2000).optional(),
  notes: z.array(z.object({
    id: z.string().min(1).max(100),
    text: z.string().trim().min(1).max(4000),
    createdAt: z.string().datetime(),
    kind: z.enum(['note', 'change', 'completion']),
  }).strict()).max(1000).optional(),
};

const createTaskSchema = z.object({
  ...taskDetails,
  title: z.string().trim().min(1, 'title is required').max(240),
  status: statusSchema.default('inbox'),
  order: z.number().int().nonnegative().optional(),
  referenceUrl: referenceSchema.optional(),
}).strict();

const updateTaskSchema = z.object({
  ...taskDetails,
  title: z.string().trim().min(1, 'title cannot be empty').max(240).optional(),
  status: statusSchema.optional(),
  order: z.number().int().nonnegative().optional(),
  referenceUrl: referenceSchema.optional(),
}).strict().refine((body) => Object.keys(body).length > 0, 'At least one task field is required');

router.get('/', asyncRoute(async (req, res) => {
  const status = req.query.status === undefined ? null : statusSchema.parse(req.query.status);
  res.json(await taskRepository.findAll(req.user.id, status));
}));

router.post('/', asyncRoute(async (req, res) => {
  const task = await taskRepository.create(req.user.id, createTaskSchema.parse(req.body));
  res.status(201).json(task);
}));

router.delete('/projects', asyncRoute(async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(1).max(2048) }).strict().parse(req.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [req.user.id]);
    const removed = await client.query('DELETE FROM github_projects WHERE user_id=$1 AND full_name=$2', [req.user.id, name]);
    const cleared = await client.query("UPDATE tasks SET project='' WHERE user_id=$1 AND project=$2", [req.user.id, name]);
    if (!removed.rowCount && !cleared.rowCount) throw new ApiError(404, 'Project not found.', 'project_not_found');
    await client.query('COMMIT');
    res.json({ tasksKept: cleared.rowCount });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

router.get('/:id/checkpoints', asyncRoute(async (req, res) => {
  const task = await taskRepository.findById(req.user.id, req.params.id);
  if (!task) throw new ApiError(404, 'Task not found', 'task_not_found');
  res.json(await checkpointRepository.findByTaskId(req.user.id, req.params.id));
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const task = await taskRepository.findById(req.user.id, req.params.id);
  if (!task) throw new ApiError(404, 'Task not found', 'task_not_found');
  res.json(task);
}));

router.patch('/:id', asyncRoute(async (req, res) => {
  const task = await taskRepository.update(req.user.id, req.params.id, updateTaskSchema.parse(req.body));
  if (!task) throw new ApiError(404, 'Task not found', 'task_not_found');
  res.json(task);
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const deleted = await taskRepository.delete(req.user.id, req.params.id);
  if (!deleted) throw new ApiError(404, 'Task not found', 'task_not_found');
  res.status(204).end();
}));

export default router;
