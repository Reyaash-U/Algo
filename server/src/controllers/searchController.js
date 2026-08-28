import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiError.js';
import { searchPublicResources } from '../services/searchServiceDb.js';

export const query = asyncHandler(async (req, res) => {
  const q = req.query?.q ?? '';
  const results = await searchPublicResources(q);
  res.status(200).json(
    ok({
      query: q,
      results,
    }),
  );
});
