import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiError.js';
import { toProblemDTO } from '../models/Problem.js';
import { resolveProblem } from '../services/problemFetchService.js';

export const resolve = asyncHandler(async (req, res) => {
  const problem = await resolveProblem(req.body?.url);
  res.status(200).json(ok(toProblemDTO(problem)));
});
