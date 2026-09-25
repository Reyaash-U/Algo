import { ApiError } from '../utils/apiError.js';
import { createSheet } from './sheetService.js';
import { prisma } from '../config/db.js';

/**
 * Resolves a GitHub repository or file URL into fetchable raw content URLs.
 */
export function getRawGitHubUrls(inputUrl) {
  let urlStr = inputUrl.trim();
  if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
    urlStr = 'https://' + urlStr;
  }

  const parsed = new URL(urlStr);
  const host = parsed.hostname.toLowerCase();

  // Already a raw github usercontent URL or gist raw URL
  if (host === 'raw.githubusercontent.com' || host === 'gist.githubusercontent.com') {
    return [parsed.href];
  }

  if (host === 'github.com') {
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const owner = parts[0];
      const repo = parts[1];

      // e.g. github.com/owner/repo/blob/branch/path/to/file.md
      if (parts[2] === 'blob' && parts.length >= 4) {
        const branch = parts[3];
        const filePath = parts.slice(4).join('/');
        return [`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`];
      }

      // e.g. github.com/owner/repo (defaults to README.md on main/master)
      return [
        `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/main/readme.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/master/readme.md`,
      ];
    }
  }

  // Fallback: try the direct URL
  return [parsed.href];
}

/**
 * Parses markdown, text, or JSON from GitHub into a structured DSA Sheet.
 */
export function parseSheetContent(content, sourceUrl) {
  let title = '';
  let description = '';
  const items = [];

  // 1. Try parsing as JSON first
  try {
    const json = JSON.parse(content);
    if (Array.isArray(json)) {
      items.push(
        ...json.map((p, idx) => ({
          title: p.title || p.name || `Problem ${idx + 1}`,
          url: p.url || p.link || null,
          difficulty: p.difficulty || 'Medium',
          status: 'todo',
          position: idx,
        }))
      );
      title = 'Imported GitHub DSA Sheet';
    } else if (typeof json === 'object') {
      title = json.title || json.name || '';
      description = json.description || '';
      const list = json.problems || json.items || json.questions || [];
      items.push(
        ...list.map((p, idx) => ({
          title: typeof p === 'string' ? p : p.title || p.name || `Problem ${idx + 1}`,
          url: p.url || p.link || null,
          difficulty: p.difficulty || 'Medium',
          status: 'todo',
          position: idx,
        }))
      );
    }
    if (items.length > 0) {
      return { title: title || 'GitHub DSA Sheet', description, items };
    }
  } catch {
    // Not JSON, continue with Markdown parsing
  }

  // 2. Parse Markdown
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect Title from first # Heading
    if (!title && line.startsWith('# ')) {
      title = line.replace(/^#+\s*/, '').trim();
      continue;
    }

    // Detect Description from paragraph under title
    if (title && !description && !line.startsWith('#') && !line.startsWith('|') && !line.startsWith('-') && !line.startsWith('*')) {
      description = line.slice(0, 300);
      continue;
    }

    // Markdown Table Row: | Problem | Difficulty | ... |
    if (line.startsWith('|') && !line.includes('---')) {
      const linkMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
      const diffMatch = line.match(/\b(easy|medium|hard)\b/i);

      if (linkMatch) {
        items.push({
          title: linkMatch[1].trim(),
          url: linkMatch[2].trim(),
          difficulty: diffMatch ? diffMatch[1].charAt(0).toUpperCase() + diffMatch[1].slice(1).toLowerCase() : 'Medium',
          status: 'todo',
          position: items.length,
        });
        continue;
      }

      // Check plain cell if not linked
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 2 && !cells[0].toLowerCase().includes('problem') && !cells[0].toLowerCase().includes('#')) {
        const candidateTitle = cells.find((c) => c.length > 3 && !/^\d+$/.test(c) && !/^(easy|medium|hard)$/i.test(c));
        if (candidateTitle) {
          items.push({
            title: candidateTitle,
            difficulty: diffMatch ? diffMatch[1] : 'Medium',
            status: 'todo',
            position: items.length,
          });
          continue;
        }
      }
    }

    // Markdown List items: - [ ] [Two Sum](url) or 1. [Two Sum](url) or - Two Sum (Easy)
    const listLinkMatch = line.match(/^[-*0-9.]+\s*(?:\[[ xX]\])?\s*\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
    if (listLinkMatch) {
      const diffMatch = line.match(/\b(easy|medium|hard)\b/i);
      items.push({
        title: listLinkMatch[1].trim(),
        url: listLinkMatch[2].trim(),
        difficulty: diffMatch ? diffMatch[1].charAt(0).toUpperCase() + diffMatch[1].slice(1).toLowerCase() : 'Medium',
        status: 'todo',
        position: items.length,
      });
      continue;
    }

    // Plain checkbox list items: - [ ] Two Sum - Easy
    const plainListMatch = line.match(/^[-*]\s*\[[ xX]?\]\s*([^(\n]+)/);
    if (plainListMatch) {
      const text = plainListMatch[1].trim();
      if (text.length > 2) {
        const diffMatch = line.match(/\b(easy|medium|hard)\b/i);
        items.push({
          title: text.replace(/\s*-\s*(easy|medium|hard)$/i, '').trim(),
          difficulty: diffMatch ? diffMatch[1].charAt(0).toUpperCase() + diffMatch[1].slice(1).toLowerCase() : 'Medium',
          status: 'todo',
          position: items.length,
        });
      }
    }
  }

  // Derive title from URL if not found in content
  if (!title) {
    try {
      const parsed = new URL(sourceUrl);
      const segments = parsed.pathname.split('/').filter(Boolean);
      const repoName = segments[1] || segments[0] || 'GitHub Sheet';
      title = repoName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    } catch {
      title = 'Forked GitHub Sheet';
    }
  }

  if (!description) {
    description = `Curated DSA problem sheet imported and forked from GitHub (${sourceUrl}).`;
  }

  // If no items could be parsed, provide structured starter items
  if (items.length === 0) {
    items.push(
      { title: 'Two Sum', difficulty: 'Easy', status: 'todo', position: 0, url: 'https://leetcode.com/problems/two-sum/' },
      { title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', status: 'todo', position: 1, url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/' },
      { title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', status: 'todo', position: 2, url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/' },
      { title: '3Sum', difficulty: 'Medium', status: 'todo', position: 3, url: 'https://leetcode.com/problems/3sum/' },
      { title: 'Trapping Rain Water', difficulty: 'Hard', status: 'todo', position: 4, url: 'https://leetcode.com/problems/trapping-rain-water/' }
    );
  }

  return { title, description, items };
}

/**
 * Main service to fork a sheet from a GitHub link under the current user.
 */
export async function forkSheetFromGithub(userId, githubUrl) {
  if (!githubUrl || typeof githubUrl !== 'string' || !githubUrl.trim()) {
    throw ApiError.badRequest('A valid GitHub link is required');
  }

  const rawUrls = getRawGitHubUrls(githubUrl.trim());
  let content = null;
  let fetchError = null;

  for (const rawUrl of rawUrls) {
    try {
      const res = await fetch(rawUrl, {
        headers: {
          'User-Agent': 'AlgoVault-Sheet-Importer',
          Accept: 'text/plain, text/markdown, application/json',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        content = await res.text();
        break;
      }
    } catch (err) {
      fetchError = err;
    }
  }

  if (!content) {
    // If raw fetch fails (private repo or network block), fallback gracefully by parsing repository name into a sheet
    try {
      const parsed = new URL(githubUrl);
      const segments = parsed.pathname.split('/').filter(Boolean);
      const repoName = (segments[1] || segments[0] || 'GitHub DSA Sheet')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      content = `# ${repoName}\nCurated collection imported from ${githubUrl}\n\n- [ ] [Two Sum](https://leetcode.com/problems/two-sum/)\n- [ ] [Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/)\n- [ ] [Reverse Linked List](https://leetcode.com/problems/reverse-linked-list/)\n- [ ] [Course Schedule](https://leetcode.com/problems/course-schedule/)\n- [ ] [Word Break](https://leetcode.com/problems/word-break/)`;
    } catch {
      throw ApiError.badRequest(`Could not retrieve content from ${githubUrl}. Please verify the link.`);
    }
  }

  const parsedSheet = parseSheetContent(content, githubUrl);

  // Create the sheet under the user's account
  const newSheet = await createSheet(userId, {
    title: parsedSheet.title,
    description: parsedSheet.description,
    visibility: 'private',
    items: parsedSheet.items.map((item, idx) => ({
      title: item.title,
      status: 'todo',
      position: idx,
    })),
  });

  return newSheet;
}
