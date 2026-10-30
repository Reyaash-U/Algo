import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../config/db.js';
import {
  parseCodeChefProfile,
  parseCodeChefRecent,
  normalizeCodeChefUsername,
  fetchCodeChefProfile,
  syncCodeChef,
  disconnectCodeChef,
} from '../services/codechefSyncService.js';

// Trimmed from the structure of a real https://www.codechef.com/users/<handle> page.
const profileHtml = (over = {}) => `
<html><body>
<div class="user-details-container plr10"><header>
  <img class='profileImage' src='https://cdn.codechef.com/x.jpg' width='70px' alt='user profile'/>
  <h1 class="h2-style">Some &amp; One</h1></header>
  <ul><li><span class="user-country-name" style="vertical-align:bottom">India</span></li></ul>
</div>
<div class="rating-header text-center">
  <div class="rating-number">
    ${over.rating ?? '1850'}
  </div>
  <div>(Div 2)</div>
  <div class="rating-star"><span>&#9733;</span><span>&#9733;</span><span>&#9733;</span><span>&#9733;</span></div>
  <a href="/ratings"><strong>CodeChef Rating</strong></a>
  <small>(Highest Rating 1900)</small>
</div>
<div class="rating-ranks"><ul class="inline-list"><li><a href="/ratings/all"><strong> Inactive </strong></a> Global Rank</li></ul></div>
<section class="problems-solved"><h3>Total Problems Solved: 321</h3></section>
<script>
var all_rating = [{"code":"START1","getyear":"2024","getmonth":"1","getday":"10","rating":"1700","rank":"120","name":"Starters 1 (Rated)","end_date":"2024-01-10 22:00:00"},{"code":"START2","rating":"1850","rank":"45","name":"Starters 2 (Rated)","end_date":"2024-02-10 22:00:00"}];
var userDailySubmissionsStats = [];
</script>
</body></html>`;

test('parseCodeChefProfile extracts rating, stars, solved, profile and history', () => {
  const s = parseCodeChefProfile(profileHtml());
  assert.equal(s.rating, 1850);
  assert.equal(s.highestRating, 1900);
  assert.equal(s.stars, 4);
  assert.equal(s.division, 'Div 2');
  assert.equal(s.totalSolved, 321);
  assert.deepEqual(s.profile, { name: 'Some & One', avatar: 'https://cdn.codechef.com/x.jpg', country: 'India' });
  assert.equal(s.contestHistory.length, 2);
  assert.deepEqual(s.contestHistory[1], { code: 'START2', title: 'Starters 2 (Rated)', rating: 1850, rank: 45, at: '2024-02-10T16:30:00.000Z' }); // 22:00 IST
});

test('an unrated user has a null rating and an empty history', () => {
  const html = profileHtml().replace(/<div class="rating-header[\s\S]*?<div class="rating-ranks">/, '<div class="rating-ranks">').replace(/var all_rating[^\n]*\n/, '');
  const s = parseCodeChefProfile(html);
  assert.equal(s.rating, null);
  assert.equal(s.stars, 0);
  assert.deepEqual(s.contestHistory, []);
  assert.equal(s.totalSolved, 321);
});

test('a page that is not a profile is reported as user-not-found', () => {
  assert.throws(() => parseCodeChefProfile('<html>CodeChef home</html>'), /User not found on CodeChef/);
});

test('fetchCodeChefProfile detects the redirect CodeChef uses for unknown users', async () => {
  const redirectedHome = async () => ({ url: 'https://www.codechef.com/', ok: true, text: async () => '' });
  await assert.rejects(() => fetchCodeChefProfile('nobody', redirectedHome), /User not found on CodeChef/);
  const good = async () => ({ url: 'https://www.codechef.com/users/someone', ok: true, text: async () => 'html' });
  assert.equal(await fetchCodeChefProfile('someone', good), 'html');
});

test('normalizeCodeChefUsername validates input', () => {
  assert.equal(normalizeCodeChefUsername(' gennady.korotkevich '), 'gennady.korotkevich');
  assert.throws(() => normalizeCodeChefUsername(''), /required/);
  assert.throws(() => normalizeCodeChefUsername('bad name!'), /valid CodeChef username/);
});

test('syncCodeChef stores stats, links the username, re-syncs in place, and disconnects', async () => {
  const fakeFetch = (html) => async () => ({ url: 'https://www.codechef.com/users/someone', ok: true, text: async () => html });
  let userId;
  try {
    const user = await prisma.user.create({
      data: { email: `cc-test-${Date.now()}@example.com`, passwordHash: 'x', displayName: 'CC Test' },
    });
    userId = user.id;

    const row = await syncCodeChef(userId, 'someone', fakeFetch(profileHtml()));
    assert.equal(row.rating, 1850);
    assert.equal(row.contestHistory.length, 2);
    assert.equal((await prisma.user.findUnique({ where: { id: userId } })).ccHandle, 'someone');

    await syncCodeChef(userId, 'someone', fakeFetch(profileHtml({ rating: '1900' })));
    assert.equal(await prisma.ccStats.count({ where: { userId } }), 1);
    assert.equal((await prisma.ccStats.findUnique({ where: { userId } })).rating, 1900);

    await disconnectCodeChef(userId);
    assert.equal(await prisma.ccStats.count({ where: { userId } }), 0);
    assert.equal((await prisma.user.findUnique({ where: { id: userId } })).ccHandle, null);
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => null);
  }
});

const recentRow = ({ time, href, code, title, score, lang, view }) => `<tr ><td  title='${time}'><span class='tooltips'><i class='fa fa-clock-o'></i></span></td><td  title='${code}'><a href='${href}' title='' target='_blank'>${code}</a></td><td  title='${score ? `(${score})` : ''}'><span title='${title}'style='display: flex;'><img src='x.gif' alt='status icon'><span>${score ? `(${score})` : ''}</span></span></td><td  title='${lang}'>${lang}</td><td class="centered" style="width:60px;" title='View'>${view}</td></tr>`;

test('parseCodeChefRecent reads status, score, language, IST time and links', () => {
  const html = `<table><thead><tr><th>Time</th><th>Problem</th></tr></thead><tbody>
    ${recentRow({ time: '11:49 PM 10/09/25', href: '/problems/CABRIDE', code: 'CABRIDE', title: 'accepted', score: 100, lang: 'C++', view: "<a class='disabled'>View</a>" })}
    ${recentRow({ time: '12:05 AM 20/08/25', href: '/START200C/problems/RNIM', code: 'RNIM', title: 'wrong answer', score: 0, lang: 'Python 3', view: "<a class = 'centered' href='/viewsolution/1183764564' target='_blank'>View</a>" })}
    <tr><td><a onclick="onload_getpage_recent_activity_user('next');">next</a></td></tr></tbody></table>`;
  const r = parseCodeChefRecent(html);
  assert.equal(r.length, 2); // header and pagination rows skipped
  assert.deepEqual(r[0], {
    problem: 'CABRIDE', url: 'https://www.codechef.com/problems/CABRIDE', status: 'accepted', score: 100,
    language: 'C++', at: '2025-09-10T18:19:00.000Z', solutionUrl: null,
  }); // 23:49 IST = 18:19 UTC
  assert.equal(r[1].url, 'https://www.codechef.com/START200C/problems/RNIM');
  assert.equal(r[1].status, 'wrong answer');
  assert.equal(r[1].at, '2025-08-19T18:35:00.000Z'); // 12:05 AM IST rolls back to the previous UTC day
  assert.equal(r[1].solutionUrl, 'https://www.codechef.com/viewsolution/1183764564');
  assert.deepEqual(parseCodeChefRecent(''), []);
});
