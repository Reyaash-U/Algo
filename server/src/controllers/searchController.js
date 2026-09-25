import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiError.js';
import { searchPublicResources, searchGlobalResources } from '../services/searchServiceDb.js';

export const query = asyncHandler(async (req, res) => {
  const q = req.query?.q ?? '';
  const scope = req.query?.scope;
  const userId = req.user?.id;

  if (scope === 'global') {
    const data = await searchGlobalResources(q, userId);
    return res.status(200).json(
      ok({
        query: q,
        results: data.results,
        grouped: {
          notes: data.notes,
          sheets: data.sheets,
          problems: data.problems,
        },
      }),
    );
  }

  const results = await searchPublicResources(q);
  res.status(200).json(
    ok({
      query: q,
      results,
    }),
  );
});
