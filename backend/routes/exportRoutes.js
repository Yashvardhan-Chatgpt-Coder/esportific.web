const express = require('express');
const mongoose = require('mongoose');
const sharp = require('sharp');
const XLSX = require('xlsx');
const fontkit = require('fontkit');
const fs = require('fs');
const path = require('path');
const https = require('https');
const Event = require('../models/Event');
const PlatformTemplate = require('../models/PlatformTemplate');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

const escapeXml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}[char]));

const safeFilename = (value) => String(value || 'event-teams')
  .replace(/[^\w\-]+/g, '_')
  .replace(/_+/g, '_')
  .replace(/^_|_$/g, '') || 'event-teams';

const yieldToServer = () => new Promise((resolve) => setImmediate(resolve));

function sendProgress(res, progress, stage) {
  res.write(`${JSON.stringify({ type: 'progress', progress, stage })}\n`);
  if (typeof res.flush === 'function') res.flush();
}

function createTeamsSvg(event, teams, organizerName) {
  const width = 1080;
  const height = 1350;
  const x = 72;
  const tableWidth = width - x * 2;
  const tableY = 290;
  const headerHeight = 62;
  const rowHeight = teams.length > 12 ? 51 : 54;
  const organizerPrefix = 'Organized by ';
  const organizerNameText = String(organizerName || '');
  const organizerPrefixWidth = template1JakartaSemiFont.layout(organizerPrefix).positions
    .reduce((sum, position) => sum + position.xAdvance, 0) * 18 / template1JakartaSemiFont.unitsPerEm;
  const organizerNameWidth = template1JakartaBoldFont.layout(organizerNameText).positions
    .reduce((sum, position) => sum + position.xAdvance, 0) * 18 / template1JakartaBoldFont.unitsPerEm;
  const organizerStartX = width - x - organizerPrefixWidth - organizerNameWidth;
  const rows = teams.map((team, index) => {
    const y = tableY + headerHeight + index * rowHeight;
    const players = (team.players || []).map((player) => player.name).filter(Boolean).join(', ') || 'No players listed';
    const fill = index % 2 ? '#f7f8fb' : '#ffffff';
    return `
      <rect x="${x}" y="${y}" width="${tableWidth}" height="${rowHeight}" fill="${fill}" stroke="#e2e5ec" stroke-width="1"/>
      ${templateTextPaths(template1JakartaBoldFont, String(index + 1), x + 52, y + 33, 18, '#080808', { anchor: 'middle' })}
      ${templateTextPaths(template1JakartaBoldFont, String(team.name || '').toUpperCase().slice(0, 25), x + 112, y + 32, 17, '#080808')}
      ${templateTextPaths(template1JakartaSemiFont, players.slice(0, 72), x + 375, y + 31, 14, '#343a46')}`;
  }).join('');
  const tableBottom = tableY + headerHeight + teams.length * rowHeight;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#ffffff"/>
    ${templateTextPaths(template1JakartaBoldFont, `${String(event.name || 'Event').toUpperCase()}  ·  PARTICIPATING TEAMS`, x, 145, 20, '#666666', { letterSpacing: 1.5 })}
    ${templateTextPaths(template1JakartaBoldFont, 'Team Roster', x, 210, 52, '#080808')}
    ${organizerName ? `${templateTextPaths(template1JakartaSemiFont, organizerPrefix, organizerStartX, 207, 18, '#666666')}${templateTextPaths(template1JakartaBoldFont, organizerNameText, organizerStartX + organizerPrefixWidth, 207, 18, '#080808')}` : ''}
    <defs><clipPath id="team-table-clip"><rect x="${x}" y="${tableY}" width="${tableWidth}" height="${headerHeight + teams.length * rowHeight}" rx="14"/></clipPath></defs>
    <g clip-path="url(#team-table-clip)">
      <rect x="${x}" y="${tableY}" width="${tableWidth}" height="${headerHeight}" fill="#080808"/>
      ${templateTextPaths(template1JakartaBoldFont, 'SLOT NO.', x + 52, tableY + 39, 15, '#ffffff', { anchor: 'middle' })}
      ${templateTextPaths(template1JakartaBoldFont, 'TEAM', x + 112, tableY + 39, 22, '#ffffff')}
      ${templateTextPaths(template1JakartaBoldFont, 'PLAYERS', x + 375, tableY + 39, 22, '#ffffff')}
      ${rows}
    </g>
    <rect x="${x}" y="${tableY}" width="${tableWidth}" height="${tableBottom - tableY}" rx="14" fill="none" stroke="#e2e5ec" stroke-width="1.5"/>
    <line x1="${x}" y1="1250" x2="${width - x}" y2="1250" stroke="#e2e5ec" stroke-width="1.5"/>
    ${templateTextPaths(template1JakartaBoldFont, 'Made With', x, 1300, 20, '#666666')}
    ${templateTextPaths(template1JakartaBoldFont, 'esportific', x + 116, 1300, 25, '#f21d49')}
    ${templateTextPaths(template1JakartaBoldFont, `${teams.length}${event.teams.length > teams.length ? ` of ${event.teams.length}` : ''} ${teams.length === 1 ? 'team' : 'teams'}`, width - x, 1300, 20, '#666666', { anchor: 'end' })}
  </svg>`;
}

const template1Directory = path.resolve(__dirname, '../assets/standings-template-1');
const template1Background = path.join(template1Directory, 'Background.png');
const template1Font = path.join(template1Directory, 'BebasNeue.ttf');
const template1LeagueGothic = path.join(template1Directory, 'LeagueGothic-Regular.ttf');
const template1LeagueFont = fontkit.openSync(template1LeagueGothic);
const template1FreeFire = path.join(template1Directory, 'free-fire-logo.png');
const template1Bgmi = path.join(template1Directory, 'bgmi-logo.png');
const template1Brand = path.join(template1Directory, 'esportific-logo.png');
const template1JakartaSemiBold = path.join(template1Directory, 'PlusJakartaSans-SemiBold.ttf');
const template1JakartaBold = path.join(template1Directory, 'PlusJakartaSans-Bold.ttf');
const template1BebasFont = fontkit.openSync(template1Font);
const template1JakartaSemiFont = fontkit.openSync(template1JakartaSemiBold);
const template1JakartaBoldFont = fontkit.openSync(template1JakartaBold);
const template2Directory = path.resolve(__dirname, '../assets/standings-template-2');
const template2Background = path.join(template2Directory, 'Background.png');
const template2FontPath = path.join(template2Directory, 'ArialRoundedMTBold.ttf');
const template2Font = fontkit.openSync(template2FontPath);
const template2FreeFire = path.join(template2Directory, 'free-fire-logo.png');
const template2Bgmi = path.join(template2Directory, 'bgmi-logo.png');
const template2Brand = path.join(template2Directory, 'esportific-logo.png');
const template3Directory = path.resolve(__dirname, '../assets/standings-template-3');
const template3Background = path.join(template3Directory, 'Background.png');
const template3Brand = path.join(template3Directory, 'esportific-logo.png');
const template3FontPath = path.join(template3Directory, 'ArialRoundedMTBold.ttf');
const template3Font = fontkit.openSync(template3FontPath);
const template4Directory = path.resolve(__dirname, '../assets/standings-template-4');
const template4Background = path.join(template4Directory, 'Background.png');
const template4Brand = path.join(template4Directory, 'esportific-logo.png');
const template4BebasBold = fontkit.openSync(path.join(template4Directory, 'BebasNeuePro-Bold.ttf'));
const template4BebasRegular = fontkit.openSync(path.join(template4Directory, 'BebasNeuePro-Regular.ttf'));
const template5Directory = path.resolve(__dirname, '../assets/standings-template-5');
const template5Background = path.join(template5Directory, 'Background.png');
const template5Brand = path.join(template5Directory, 'esportific-logo.png');
const template5FreeFire = path.join(template5Directory, 'free-fire-white.png');
const template5PermanentMarker = fontkit.openSync(path.join(template5Directory, 'PermanentMarker.ttf'));
const topShooterAssetDirectory = path.resolve(__dirname, '../assets/top-shooters');
const topShooterTemplates = [
  { directory: path.join(topShooterAssetDirectory, 'general-1'), width: 1122, height: 1402 },
  { directory: path.join(topShooterAssetDirectory, 'general-2'), width: 1122, height: 1402 },
  { directory: path.join(topShooterAssetDirectory, 'autumn'), width: 1080, height: 1350 },
].map((template) => ({
  ...template,
  background: path.join(template.directory, 'Background.png'),
  gameLogo: path.join(template.directory, 'free-fire-logo.png'),
  brandLogo: path.join(template.directory, 'esportific-logo.png'),
}));
const embeddedTemplateAssets = {};
const templateLogoCache = new Map();
function templateAssetData(pathname, mimeType) {
  if (!embeddedTemplateAssets[pathname]) {
    embeddedTemplateAssets[pathname] = `data:${mimeType};base64,${fs.readFileSync(pathname).toString('base64')}`;
  }
  return embeddedTemplateAssets[pathname];
}

function loadTemplateTeamLogo(url) {
  const cached = templateLogoCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const loading = new Promise((resolve) => {
    let parsed;
    try { parsed = new URL(url); } catch { resolve(''); return; }
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') { resolve(''); return; }
    const request = https.get(parsed, { timeout: 3500 }, (response) => {
      const contentType = String(response.headers['content-type'] || '');
      if (response.statusCode !== 200 || !contentType.startsWith('image/')) {
        response.resume();
        resolve('');
        return;
      }
      const chunks = [];
      let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > 2 * 1024 * 1024) request.destroy(new Error('Team logo is too large.'));
        else chunks.push(chunk);
      });
      response.on('end', async () => {
        if (!size) { resolve(''); return; }
        try {
          const png = await sharp(Buffer.concat(chunks)).resize(56, 56, { fit: 'inside' }).png().toBuffer();
          resolve(`data:image/png;base64,${png.toString('base64')}`);
        } catch {
          resolve('');
        }
      });
      response.on('error', () => resolve(''));
    });
    request.on('timeout', () => request.destroy(new Error('Logo request timed out.')));
    request.on('error', () => resolve(''));
  });
  templateLogoCache.set(url, { expiresAt: Date.now() + 5 * 60 * 1000, value: loading });
  return loading.then((dataUri) => {
    if (dataUri) templateLogoCache.set(url, { expiresAt: Date.now() + 30 * 60 * 1000, value: Promise.resolve(dataUri) });
    else templateLogoCache.delete(url);
    if (templateLogoCache.size > 500) templateLogoCache.delete(templateLogoCache.keys().next().value);
    return dataUri;
  });
}

function templateSafeText(font, value) {
  const fallback = font.hasGlyphForCodePoint(63) ? '?' : ' ';
  return Array.from(String(value ?? ''), (character) => (
    font.hasGlyphForCodePoint(character.codePointAt(0)) ? character : fallback
  )).join('');
}

function templateTextPaths(font, text, x, baseline, fontSize, color, { anchor = 'start', letterSpacing = 0, strokeWidth = 0 } = {}) {
  const layout = font.layout(templateSafeText(font, text));
  const scale = fontSize / font.unitsPerEm;
  const width = layout.positions.reduce((sum, position) => sum + position.xAdvance * scale, 0)
    + Math.max(0, layout.positions.length - 1) * letterSpacing;
  let cursor = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  return layout.glyphs.map((glyph, index) => {
    const position = layout.positions[index];
    const glyphX = cursor + position.xOffset * scale;
    const glyphY = baseline - position.yOffset * scale;
    cursor += position.xAdvance * scale + (index < layout.glyphs.length - 1 ? letterSpacing : 0);
    const stroke = strokeWidth > 0 ? ` stroke="${color}" stroke-width="${strokeWidth}" stroke-linejoin="round" paint-order="stroke fill"` : '';
    return `<path d="${glyph.path.toSVG()}" transform="translate(${glyphX.toFixed(2)} ${glyphY.toFixed(2)}) scale(${scale} ${-scale})" fill="${color}"${stroke}/>`;
  }).join('');
}

function templateTextPathsFitRight(font, text, rightEdge, leftLimit, baseline, fontSize, color, { letterSpacing = 0, strokeWidth = 0 } = {}) {
  const safeText = templateSafeText(font, text);
  const layout = font.layout(safeText);
  const baseScale = fontSize / font.unitsPerEm;
  const baseWidth = layout.positions.reduce((sum, position) => sum + position.xAdvance * baseScale, 0)
    + Math.max(0, layout.positions.length - 1) * letterSpacing;
  const maxWidth = Math.max(1, rightEdge - leftLimit);
  const fitScale = Math.min(1, maxWidth / Math.max(baseWidth, 1));
  const fittedFontSize = fontSize * fitScale;
  const fittedLetterSpacing = letterSpacing * fitScale;
  const fittedWidth = baseWidth * fitScale;
  // Position from the measured left edge instead of relying on SVG text-anchor,
  // and keep a small margin from the canvas edge even for unusually long copy.
  const startX = Math.max(leftLimit, rightEdge - fittedWidth);
  return templateTextPaths(font, safeText, startX, baseline, fittedFontSize, color, {
    letterSpacing: fittedLetterSpacing,
    strokeWidth,
  });
}

function createStandingsTemplate1Svg({ eventName, gameName, rows, title }) {
  const width = 1080;
  const height = 1350;
  const x = 50;
  const tableY = 321;
  const colWidths = [64, 320, 115, 140, 185, 156];
  const colStarts = [x];
  colWidths.forEach((columnWidth) => colStarts.push(colStarts[colStarts.length - 1] + columnWidth));
  const isBgmi = /bgmi|battlegrounds|pubg/i.test(gameName || '');
  const gameLogo = templateAssetData(isBgmi ? template1Bgmi : template1FreeFire, 'image/png');
  const brandLogo = templateAssetData(template1Brand, 'image/png');
  const titleFontSize = 128;
  const titleLetterSpacing = -2.8;
  const createLeagueGothicText = (text, startX, baseline, color) => {
    const layout = template1LeagueFont.layout(text);
    const scale = titleFontSize / template1LeagueFont.unitsPerEm;
    let cursor = startX;
    const paths = layout.glyphs.map((glyph, index) => {
      const position = layout.positions[index];
      const glyphX = cursor + position.xOffset * scale;
      const glyphY = baseline - position.yOffset * scale;
      cursor += (position.xAdvance * scale) + (index < layout.glyphs.length - 1 ? titleLetterSpacing : 0);
      return `<path d="${glyph.path.toSVG()}" transform="translate(${glyphX.toFixed(2)} ${glyphY.toFixed(2)}) scale(${scale} ${-scale})" fill="${color}" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke fill"/>`;
    });
    return { width: cursor - startX, markup: paths.join('') };
  };
  const titleBlack = createLeagueGothicText(title === 'MATCH RESULTS' ? 'MATCH' : 'OVERALL', 50, 218, '#111111');
  const titleOrange = createLeagueGothicText(title === 'MATCH RESULTS' ? 'RESULTS' : 'STANDINGS', 50 + titleBlack.width + 12, 218, '#ff5801');
  const safeEventName = String(eventName || 'Event').slice(0, 50).toUpperCase();
  const paddedRows = [...rows.slice(0, 16)];
  while (paddedRows.length < 16) paddedRows.push({ rank: paddedRows.length + 1, team: '', wins: '', killPoints: '', placementPoints: '', totalPoints: '' });
  const headerIcon = (xPosition, pathData) => `<path d="${pathData}" transform="translate(${xPosition} 338) scale(.667)" fill="#ffffff"/>`;
  const centeredHeader = (text, center, pathData) => {
    const labelWidth = template1JakartaBoldFont.layout(text).positions.reduce((sum, position) => sum + position.xAdvance, 0) * (13.5 / template1JakartaBoldFont.unitsPerEm) + (text.length - 1) * 0.5;
    const groupWidth = 24 + labelWidth;
    const iconX = center - groupWidth / 2;
    return `${headerIcon(iconX, pathData)}${templateTextPaths(template1JakartaBoldFont, text, iconX + 24, 353, 13.5, '#ffffff', { letterSpacing: 0.5, strokeWidth: 0.18 })}`;
  };
  const headerCells = [
    templateTextPaths(template1BebasFont, '#', x + 32, 353, 24, '#ffffff', { anchor: 'middle' }),
    `${headerIcon(colStarts[1] + 22, 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z')}${templateTextPaths(template1JakartaBoldFont, 'TEAM', colStarts[1] + 46, 353, 13.5, '#ffffff', { letterSpacing: 0.5, strokeWidth: 0.18 })}`,
    centeredHeader('WINS', (colStarts[2] + colStarts[3]) / 2, 'M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1c1.8-.41 3.23-1.8 3.61-3.6 2.47-.31 4.39-2.39 4.39-4.94V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z'),
    centeredHeader('KILL PTS', (colStarts[3] + colStarts[4]) / 2, 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z'),
    centeredHeader('PLACE PTS', (colStarts[4] + colStarts[5]) / 2, 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z'),
    centeredHeader('TOTAL PTS', (colStarts[5] + colStarts[6]) / 2, 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'),
  ].join('');
  const body = paddedRows.map((row, index) => {
    const y = tableY + 50 + index * 48;
    const team = String(row.team || '').slice(0, 36);
    const cellValue = (value) => value !== '' && value !== null && value !== undefined ? value : '-';
    const logo = row.logo ? `<image href="${row.logo}" x="${colStarts[1] + 16}" y="${y + 10}" width="28" height="28" preserveAspectRatio="xMidYMid meet"/>` : '';
    return `<g>
      <rect x="${x}" y="${y}" width="980" height="48" fill="${index % 2 ? '#f0f2f5' : '#ffffff'}"/>
      <rect x="${x}" y="${y}" width="64" height="48" fill="#ff5801"/>
      <rect x="${colStarts[5]}" y="${y}" width="156" height="48" fill="#111113"/>
      <line x1="${x}" y1="${y + 47.5}" x2="${x + 980}" y2="${y + 47.5}" stroke="#d5d8de" stroke-width="1"/>
      ${templateTextPaths(template1BebasFont, row.rank ?? index + 1, x + 32, y + 31, 24, '#ffffff', { anchor: 'middle', letterSpacing: 0.5, strokeWidth: 0.55 })}
      ${logo || (team ? `<rect x="${colStarts[1] + 16}" y="${y + 10}" width="28" height="28" rx="4" fill="#e5e7eb"/>${templateTextPaths(template1JakartaBoldFont, team.charAt(0).toUpperCase(), colStarts[1] + 30, y + 29, 13, '#374151', { anchor: 'middle' })}` : '')}
      ${team ? templateTextPaths(template1JakartaBoldFont, team.toUpperCase(), colStarts[1] + 56, y + 29, 14.5, '#111111', { letterSpacing: 0.3, strokeWidth: 0.15 }) : ''}
      ${[2, 3, 4].map((column, valueIndex) => `<line x1="${colStarts[column]}" y1="${y + 8}" x2="${colStarts[column]}" y2="${y + 40}" stroke="#d5d8de" stroke-width="1"/>${templateTextPaths(template1JakartaSemiFont, cellValue([row.wins, row.killPoints, row.placementPoints][valueIndex]), (colStarts[column] + colStarts[column + 1]) / 2, y + 30, 16, '#111111', { anchor: 'middle' })}`).join('')}
      ${templateTextPaths(template1BebasFont, cellValue(row.totalPoints), (colStarts[5] + colStarts[6]) / 2, y + 34, 31, '#ff5801', { anchor: 'middle', letterSpacing: 0.5, strokeWidth: 0.75 })}
    </g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><clipPath id="tableClip"><rect x="${x}" y="${tableY}" width="980" height="818" rx="14"/></clipPath></defs>
    <image href="${templateAssetData(template1Background, 'image/png')}" x="0" y="0" width="1080" height="1350"/>
    <image href="${gameLogo}" x="50" y="42" width="240" height="42" preserveAspectRatio="xMinYMid meet"/>
      ${titleBlack.markup}${titleOrange.markup}
    <g transform="translate(50 241) skewX(-18)"><rect width="${Math.min(800, Math.max(230, safeEventName.length * 11 + 30))}" height="34" fill="#ff5801"/>${templateTextPaths(template1JakartaBoldFont, safeEventName, 14, 23, 17, '#ffffff', { strokeWidth: 0.2 })}<path d="M${Math.min(800, Math.max(230, safeEventName.length * 11 + 30)) + 18},0 h6 l-8,34 h-6 z M${Math.min(800, Math.max(230, safeEventName.length * 11 + 30)) + 32},0 h6 l-8,34 h-6 z M${Math.min(800, Math.max(230, safeEventName.length * 11 + 30)) + 46},0 h6 l-8,34 h-6 z" fill="#ff5801"/></g>
    <g clip-path="url(#tableClip)"><rect x="${x}" y="${tableY}" width="980" height="50" fill="#ff5801"/><rect x="${colStarts[5]}" y="${tableY}" width="156" height="50" fill="#111113"/>${headerCells}${body}</g>
    <rect x="${x}" y="${tableY}" width="980" height="818" rx="14" fill="none" stroke="#d5d8de" stroke-width="1.5"/>
    ${templateTextPaths(template1JakartaBoldFont, 'Made with', 54, 1302, 15, '#ffffff', { letterSpacing: 0.5 })}
    <image href="${brandLogo}" x="54" y="1310" width="180" height="29" preserveAspectRatio="xMinYMid meet" filter="brightness(0) invert(1)"/>
    ${(() => {
      const lead = isBgmi ? 'WINNER WINNER' : 'COMPETE. SURVIVE.';
      const accent = isBgmi ? 'CHICKEN DINNER!' : 'BOOYAH!';
      const fontSize = 15;
      const spacing = 0.5;
      const measure = (text, size, letterSpacing) => template1JakartaBoldFont.layout(text).positions.reduce((sum, position) => sum + position.xAdvance, 0) * size / template1JakartaBoldFont.unitsPerEm + (text.length - 1) * letterSpacing;
      const leadWidth = measure(lead, fontSize, spacing);
      const accentWidth = measure(accent, fontSize, spacing);
      const totalWidth = leadWidth + 7 + accentWidth;
      const fitScale = Math.min(1, 560 / Math.max(totalWidth, 1));
      const fittedSize = fontSize * fitScale;
      const fittedSpacing = spacing * fitScale;
      const fittedLeadWidth = measure(lead, fittedSize, fittedSpacing);
      const startX = 1024 - totalWidth * fitScale;
      return `${templateTextPaths(template1JakartaBoldFont, lead, startX, 1310, fittedSize, '#111113', { letterSpacing: fittedSpacing })}${templateTextPaths(template1JakartaBoldFont, accent, startX + fittedLeadWidth + 7 * fitScale, 1310, fittedSize, '#ff5801', { letterSpacing: fittedSpacing })}`;
    })()}
  </svg>`;
}

function createStandingsTemplate2Svg({ eventName, gameName, rows }) {
  const width = 1080;
  const height = 1350;
  const x = 38;
  const tableY = 382;
  const headerHeight = 58;
  const rowHeight = 45.5;
  const columnWidths = [75, 315, 120, 150, 184, 160];
  const columns = [x];
  columnWidths.forEach(columnWidth => columns.push(columns[columns.length - 1] + columnWidth));
  const isBgmi = /bgmi|battlegrounds|pubg/i.test(gameName || '');
  const safeEventName = String(eventName || 'Event').replace(/\s+/g, ' ').trim().slice(0, 48);
  const gameLogo = templateAssetData(isBgmi ? template2Bgmi : template2FreeFire, 'image/png');
  const brandLogo = templateAssetData(template2Brand, 'image/png');

  // Lay out the event name along the template's quadratic title arch.
  const layout = template2Font.layout(templateSafeText(template2Font, safeEventName || 'Event'));
  const curveScale = Math.min(46 / template2Font.unitsPerEm, 680 / Math.max(1, layout.positions.reduce((sum, pos) => sum + pos.xAdvance, 0) * (46 / template2Font.unitsPerEm)));
  const glyphAdvances = layout.positions.map(position => position.xAdvance * curveScale);
  const titleWidth = glyphAdvances.reduce((sum, advance) => sum + advance, 0) + Math.max(0, glyphAdvances.length - 1) * -0.3;
  const curveSamples = [];
  let curveLength = 0;
  let previousPoint = null;
  for (let index = 0; index <= 300; index += 1) {
    const t = index / 300;
    const point = { t, x: 120 + 760 * t, y: 86 - 116 * t + 116 * t * t };
    if (previousPoint) curveLength += Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
    curveSamples.push({ ...point, distance: curveLength });
    previousPoint = point;
  }
  const pointAtDistance = (distance) => {
    const target = Math.max(0, Math.min(curveLength, distance));
    let low = 0;
    let high = curveSamples.length - 1;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (curveSamples[middle].distance < target) low = middle + 1;
      else high = middle;
    }
    const upper = curveSamples[low];
    const lower = curveSamples[Math.max(0, low - 1)];
    const span = upper.distance - lower.distance || 1;
    const ratio = (target - lower.distance) / span;
    const t = lower.t + (upper.t - lower.t) * ratio;
    return { t, x: 120 + 760 * t, y: 86 - 116 * t + 116 * t * t };
  };
  const titleMarkup = layout.glyphs.map((glyph, index) => {
    const advance = glyphAdvances[index];
    const position = pointAtDistance((curveLength - titleWidth) / 2 + glyphAdvances.slice(0, index).reduce((sum, item) => sum + item - 0.3, 0) + advance / 2);
    const angle = Math.atan2(-116 + 232 * position.t, 760) * (180 / Math.PI);
    const glyphX = position.x + 40;
    const glyphY = position.y + 275;
    return `<path d="${glyph.path.toSVG()}" transform="translate(${glyphX.toFixed(2)} ${glyphY.toFixed(2)}) rotate(${angle.toFixed(2)}) scale(${curveScale} ${-curveScale}) translate(${(-advance / (2 * curveScale)).toFixed(2)} 0)" fill="#18181a"/>`;
  }).join('');
  const leftStar = pointAtDistance((curveLength - titleWidth) / 2 - 18);
  const rightStar = pointAtDistance((curveLength + titleWidth) / 2 + 18);
  const starMarkup = [leftStar, rightStar].map(point => {
    const angle = Math.atan2(-116 + 232 * point.t, 760) * (180 / Math.PI);
    return `<path d="M0 -9L2.2 -2.2L9 0L2.2 2.2L0 9L-2.2 2.2L-9 0L-2.2 -2.2Z" transform="translate(${(point.x + 40).toFixed(2)} ${(point.y + 275).toFixed(2)}) rotate(${angle.toFixed(2)})" fill="#18181a"/>`;
  }).join('');

  const headerLabels = [
    { text: '#', x: x + columnWidths[0] / 2, fontSize: 22, anchor: 'middle' },
    { text: 'TEAM', x: columns[1] + 20, fontSize: 15 },
    { text: 'WINS', x: (columns[2] + columns[3]) / 2, fontSize: 15, anchor: 'middle' },
    { text: 'KILL\\nPOINTS', x: (columns[3] + columns[4]) / 2, fontSize: 13.5, anchor: 'middle', lineHeight: 15.5 },
    { text: 'PLACEMENT\\nPOINTS', x: (columns[4] + columns[5]) / 2, fontSize: 13.5, anchor: 'middle', lineHeight: 15.5 },
    { text: 'TOTAL\\nPOINTS', x: (columns[5] + columns[6]) / 2, fontSize: 13.5, anchor: 'middle', lineHeight: 15.5 },
  ];
  const headerMarkup = headerLabels.map(label => {
    const lines = label.text.split('\\n');
    const lineHeight = label.lineHeight || label.fontSize * 1.2;
      return lines.map((line, index) => templateTextPaths(
      template2Font,
      line,
      label.x,
        tableY + (headerHeight / 2) + (index - (lines.length - 1) / 2) * lineHeight + label.fontSize * 0.34,
      label.fontSize,
      '#ffffff',
      { anchor: label.anchor || 'start', letterSpacing: label.text === '#' ? 0 : 0.5, strokeWidth: 0.25 },
    )).join('');
  }).join('');

  const paddedRows = [...rows.slice(0, 16)];
  while (paddedRows.length < 16) paddedRows.push({ rank: paddedRows.length + 1, team: '', wins: '', killPoints: '', placementPoints: '', totalPoints: '' });
  const body = paddedRows.map((row, index) => {
    const y = tableY + headerHeight + index * rowHeight;
    const fill = index % 2 ? '#f7e5bf' : '#fdf2dc';
    const team = String(row.team || '').slice(0, 36);
    const teamLabel = team.toUpperCase();
    const logo = row.logo
      ? `<image href="${row.logo}" x="${columns[1] + 18}" y="${(y + (rowHeight - 26) / 2).toFixed(2)}" width="26" height="26" preserveAspectRatio="xMidYMid meet"/>`
      : team ? `<circle cx="${columns[1] + 31}" cy="${(y + rowHeight / 2).toFixed(2)}" r="13" fill="#c80f0a"/>${templateTextPaths(template2Font, Array.from(team)[0].toUpperCase(), columns[1] + 31, y + rowHeight / 2 + 4, 12, '#ffffff', { anchor: 'middle' })}` : '';
    const values = [row.wins, row.killPoints, row.placementPoints, row.totalPoints];
    const valueCells = values.map((value, offset) => {
      const columnIndex = offset + 2;
      const center = (columns[columnIndex] + columns[columnIndex + 1]) / 2;
      return templateTextPaths(template2Font, value === '' || value === null || value === undefined ? '-' : value, center, y + rowHeight / 2 + 5.5, 17, '#18181a', { anchor: 'middle', strokeWidth: 0.35 });
    }).join('');
    const rankMarkup = templateTextPaths(template2Font, row.rank ?? index + 1, x + columnWidths[0] / 2, y + rowHeight / 2 + 6, 18, '#18181a', { anchor: 'middle', strokeWidth: 0.55 });
    const teamMarkup = templateTextPaths(template2Font, teamLabel, columns[1] + 18 + (team ? 26 + 14 : 0), y + rowHeight / 2 + 5.5, 16, '#18181a', { strokeWidth: 0.35 });
    return `<g><rect x="${x}" y="${y}" width="1004" height="${rowHeight}" fill="${fill}"/><line x1="${x}" y1="${(y + rowHeight).toFixed(2)}" x2="${x + 1004}" y2="${(y + rowHeight).toFixed(2)}" stroke="#ebcf9f" stroke-width="1"/>${[1, 2, 3, 4, 5].map(column => `<line x1="${columns[column]}" y1="${y}" x2="${columns[column]}" y2="${(y + rowHeight).toFixed(2)}" stroke="#ebd0a0" stroke-width="1"/>`).join('')}${rankMarkup}${logo}${teamMarkup}${valueCells}</g>`;
  }).join('');

  const tableHeight = headerHeight + paddedRows.length * rowHeight;
  const gameLogoHeight = isBgmi ? 44 : 48;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <image href="${templateAssetData(template2Background, 'image/png')}" x="0" y="0" width="1080" height="1350"/>
    <image href="${gameLogo}" x="${width / 2 - 120}" y="52" width="240" height="${gameLogoHeight}" preserveAspectRatio="xMidYMid meet"/>
    ${starMarkup}${titleMarkup}
    <defs><clipPath id="template2TableClip"><rect x="${x}" y="${tableY}" width="1004" height="${tableHeight}" rx="16"/></clipPath></defs>
    <g clip-path="url(#template2TableClip)"><rect x="${x}" y="${tableY}" width="1004" height="${headerHeight}" fill="#c80f0a"/><rect x="${x}" y="${tableY + headerHeight}" width="1004" height="${tableHeight - headerHeight}" fill="#fdf2dc"/><rect x="${columns[1]}" y="${tableY}" width="${columnWidths[1]}" height="${headerHeight}" fill="#c80f0a"/>${headerMarkup}${body}</g>
    <rect x="${x}" y="${tableY}" width="1004" height="${tableHeight}" rx="16" fill="none" stroke="#ebd0a0" stroke-width="1"/>
    ${templateTextPaths(template2Font, 'Made With', 48, 1270, 17.5, '#ffffff', { letterSpacing: 0.3 })}
    <image href="${brandLogo}" x="48" y="1277" width="190" height="35" preserveAspectRatio="xMinYMid meet" filter="brightness(0) invert(1)"/>
    ${templateTextPathsFitRight(template2Font, isBgmi ? 'WINNER WINNER CHICKEN DINNER' : 'COMPETE SURVIVE BOOYAH', 1024, 440, 1300, 16.5, '#ffffff', { letterSpacing: 0.6 })}
  </svg>`;
}

function createStandingsTemplate3Svg({ eventName, rows }) {
  const width = 1080;
  const height = 1350;
  const x = 28;
  const tableY = 454;
  const tableWidth = 1024;
  const headerHeight = 60;
  const rowHeight = 45.6;
  const columnWidths = [70, 384, 130, 130, 130, 180];
  const columns = [x];
  columnWidths.forEach(columnWidth => columns.push(columns[columns.length - 1] + columnWidth));
  const safeEventName = String(eventName || 'EVENT NAME HERE').replace(/\s+/g, ' ').trim().slice(0, 60);
  const curvePoint = t => ({ x: 140 + 800 * t, y: 440 - 220 * t * (1 - t) });
  const samples = [];
  let curveLength = 0;
  let previous;
  for (let index = 0; index <= 400; index += 1) {
    const t = index / 400;
    const point = curvePoint(t);
    if (previous) curveLength += Math.hypot(point.x - previous.x, point.y - previous.y);
    samples.push({ ...point, t, distance: curveLength });
    previous = point;
  }
  const pointAtDistance = distance => {
    const target = Math.max(0, Math.min(curveLength, distance));
    let low = 0;
    let high = samples.length - 1;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (samples[middle].distance < target) low = middle + 1;
      else high = middle;
    }
    const upper = samples[low];
    const lower = samples[Math.max(0, low - 1)];
    const ratio = (target - lower.distance) / (upper.distance - lower.distance || 1);
    const t = lower.t + (upper.t - lower.t) * ratio;
    return { ...curvePoint(t), t };
  };

  const titleLayout = template3Font.layout(templateSafeText(template3Font, safeEventName || 'Event'));
  const fontSize = 36;
  const baseScale = fontSize / template3Font.unitsPerEm;
  const measuredWidth = titleLayout.positions.reduce((sum, position) => sum + position.xAdvance * baseScale, 0) + Math.max(0, titleLayout.positions.length - 1) * 0.5;
  const titleScale = baseScale * Math.min(1, 720 / Math.max(measuredWidth, 1));
  const titleAdvances = titleLayout.positions.map(position => position.xAdvance * titleScale);
  const titleWidth = titleAdvances.reduce((sum, advance) => sum + advance, 0) + Math.max(0, titleAdvances.length - 1) * 0.5;
  let titleDistance = (curveLength - titleWidth) / 2;
  const titleMarkup = titleLayout.glyphs.map((glyph, index) => {
    const advance = titleAdvances[index];
    const point = pointAtDistance(titleDistance + advance / 2);
    const angle = Math.atan2(-220 + 440 * point.t, 800) * 180 / Math.PI;
    titleDistance += advance + 0.5;
    return `<path d="${glyph.path.toSVG()}" transform="translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${angle.toFixed(2)}) scale(${titleScale} ${-titleScale}) translate(${(-advance / (2 * titleScale)).toFixed(2)} 0)" fill="#006d6a" stroke="#006d6a" stroke-width="1.8" stroke-linejoin="round" paint-order="stroke fill"/>`;
  }).join('');
  const sparkleAt = distance => {
    const point = pointAtDistance(distance);
    const angle = Math.atan2(-220 + 440 * point.t, 800) * 180 / Math.PI;
    return `<path d="M0 -10L2.4 -2.4L10 0L2.4 2.4L0 10L-2.4 2.4L-10 0L-2.4 -2.4Z" transform="translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${angle.toFixed(2)})" fill="#006d6a"/>`;
  };
  const titleStars = `${sparkleAt((curveLength - titleWidth) / 2 - 22)}${sparkleAt((curveLength + titleWidth) / 2 + 22)}`;

  const headers = [
    { label: '#', center: x + 35, size: 18 },
    { label: 'TEAM', center: columns[1] + 22, size: 18, anchor: 'start' },
    { label: 'WINS', center: columns[2] + 65, size: 16 },
    { label: 'KILL\nPOINTS', center: columns[3] + 65, size: 14.5 },
    { label: 'PLACEMENT\nPOINTS', center: columns[4] + 65, size: 14.5 },
    { label: 'TOTAL\nPOINTS', center: columns[5] + 90, size: 14.5 },
  ];
  const headerMarkup = headers.map(header => {
    const lines = header.label.split('\n');
    const lineHeight = header.size * 1.12;
    return lines.map((line, index) => templateTextPaths(
      template3Font,
      line,
      header.center,
      tableY + headerHeight / 2 + (index - (lines.length - 1) / 2) * lineHeight + header.size * 0.34,
      header.size,
      '#ffffff',
      { anchor: header.anchor || 'middle', letterSpacing: 0.5, strokeWidth: 0.55 },
    )).join('');
  }).join('');

  const paddedRows = [...rows.slice(0, 16)];
  while (paddedRows.length < 16) paddedRows.push({ rank: paddedRows.length + 1, team: '', wins: '', killPoints: '', placementPoints: '', totalPoints: '' });
  const body = paddedRows.map((row, index) => {
    const y = tableY + headerHeight + index * rowHeight;
    const team = String(row.team || '').slice(0, 36);
    const logoX = columns[1] + 18;
    const logoY = y + (rowHeight - 28) / 2;
    const logo = row.logo
      ? `<image href="${row.logo}" x="${logoX}" y="${logoY.toFixed(2)}" width="28" height="28" preserveAspectRatio="xMidYMid meet"/>`
      : team ? `<circle cx="${logoX + 14}" cy="${logoY + 14}" r="13" fill="#e8e1cf" stroke="#cfc5b4" stroke-width="1"/>${templateTextPaths(template3Font, team.charAt(0).toUpperCase(), logoX + 14, logoY + 19, 14, '#006d6a', { anchor: 'middle', strokeWidth: 0.35 })}` : '';
    const rank = templateTextPaths(template3Font, row.rank ?? index + 1, x + 35, y + rowHeight / 2 + 7, 20, '#18181a', { anchor: 'middle', strokeWidth: 0.8 });
    const teamName = templateTextPaths(template3Font, team.toUpperCase(), columns[1] + (team ? 60 : 18), y + rowHeight / 2 + 6.5, 18.5, '#18181a', { strokeWidth: 0.7 });
    const values = [row.wins, row.killPoints, row.placementPoints, row.totalPoints].map((value, offset) => {
      const columnIndex = offset + 2;
      return templateTextPaths(template3Font, value === '' || value === null || value === undefined ? '-' : value, columns[columnIndex] + columnWidths[columnIndex] / 2, y + rowHeight / 2 + 7, 19.5, '#18181a', { anchor: 'middle', strokeWidth: 0.8 });
    }).join('');
    const fill = index % 2 === 0 ? '#f3ebde' : '#e8e1cf';
    return `<g><rect x="${x}" y="${y.toFixed(2)}" width="${tableWidth}" height="${rowHeight}" fill="${fill}"/><line x1="${x}" y1="${(y + rowHeight).toFixed(2)}" x2="${x + tableWidth}" y2="${(y + rowHeight).toFixed(2)}" stroke="#dcd3c3" stroke-width="1"/>${[1, 2, 3, 4, 5].map(column => `<line x1="${columns[column]}" y1="${y.toFixed(2)}" x2="${columns[column]}" y2="${(y + rowHeight).toFixed(2)}" stroke="#dcd3c3" stroke-width="1"/>`).join('')}${rank}${logo}${teamName}${values}</g>`;
  }).join('');
  const tableHeight = headerHeight + paddedRows.length * rowHeight;
  const brandLogo = templateAssetData(template3Brand, 'image/png');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><clipPath id="template3TableClip"><rect x="${x}" y="${tableY}" width="${tableWidth}" height="${tableHeight.toFixed(2)}" rx="14"/></clipPath></defs>
    <image href="${templateAssetData(template3Background, 'image/png')}" x="0" y="0" width="${width}" height="${height}"/>
    ${titleStars}${titleMarkup}
    <g clip-path="url(#template3TableClip)"><rect x="${x}" y="${tableY}" width="${tableWidth}" height="${headerHeight}" fill="#006d6a"/>${headerMarkup}${body}</g>
    <rect x="${x}" y="${tableY}" width="${tableWidth}" height="${tableHeight.toFixed(2)}" rx="14" fill="none" stroke="#dcd3c3" stroke-width="1.5"/>
    ${templateTextPaths(template3Font, 'Made With', width / 2, 1287, 15, '#006d6a', { anchor: 'middle', letterSpacing: 0.4 })}
    <image href="${brandLogo}" x="${width / 2 - 70}" y="1293" width="140" height="30" preserveAspectRatio="xMidYMid meet"/>
  </svg>`;
}

function createStandingsTemplate4Svg({ eventName, gameName, rows, title }) {
  const width = 1080;
  const height = 1350;
  const tableX = 108;
  const tableY = 416;
  const tableWidth = 864;
  const headerHeight = 40;
  const rowHeight = 45.5;
  const columns = [76, 303, 85, 125, 155, 120];
  const starts = [tableX];
  columns.forEach(columnWidth => starts.push(starts[starts.length - 1] + columnWidth));
  const textPathsFit = (font, text, x, baseline, size, color, maxWidth, options = {}) => {
    const layout = font.layout(templateSafeText(font, text));
    const widthAtSize = layout.positions.reduce((sum, position) => sum + position.xAdvance, 0) * size / font.unitsPerEm;
    return templateTextPaths(font, text, x, baseline, size * Math.min(1, maxWidth / Math.max(widthAtSize, 1)), color, options);
  };
  const truncateToWidth = (font, text, size, maxWidth) => {
    let value = String(text || '').toUpperCase();
    while (value && font.layout(templateSafeText(font, `${value}…`)).positions.reduce((sum, position) => sum + position.xAdvance, 0) * size / font.unitsPerEm > maxWidth) {
      value = value.slice(0, -1);
    }
    return value.length < String(text || '').length ? `${value}…` : value;
  };
  const brandGame = String(gameName || 'Battle Royale').trim();
  const safeEventName = String(eventName || 'Event').replace(/\s+/g, ' ').trim().slice(0, 60);
  const subtitle = safeEventName.toUpperCase();
  const paddedRows = [...rows.slice(0, 16)];
  while (paddedRows.length < 16) paddedRows.push({ rank: paddedRows.length + 1, team: '', wins: '', killPoints: '', placementPoints: '', totalPoints: '' });

  const headerLabels = [
    { label: 'RANK', x: tableX + 20, anchor: 'start', size: 12.5 },
    { label: 'TEAM', x: starts[1] + 14, anchor: 'start', size: 12.5 },
    { label: 'WINS', x: starts[2] + columns[2] / 2, anchor: 'middle', size: 12.5 },
    { label: 'KILL POINTS', x: starts[3] + columns[3] / 2, anchor: 'middle', size: 12.5 },
    { label: 'PLACEMENT POINTS', x: starts[4] + columns[4] / 2, anchor: 'middle', size: 12.5 },
    { label: 'TOTAL POINTS', x: starts[5] + columns[5] / 2, anchor: 'middle', size: 12.5 },
  ];
  const headerMarkup = headerLabels.map(label => textPathsFit(
    template1JakartaBoldFont, label.label, label.x, tableY + 25, label.size, label.label === 'TOTAL POINTS' ? '#ffffff' : '#2e2219',
    label.anchor === 'middle' ? columns[headerLabels.indexOf(label)] - 12 : columns[headerLabels.indexOf(label)] - 24,
    { anchor: label.anchor, letterSpacing: 1.1, strokeWidth: 0.25 },
  )).join('');

  const body = paddedRows.map((row, index) => {
    const y = tableY + headerHeight + index * rowHeight;
    const isLeader = index === 0;
    const fill = index % 2 === 0 ? '#f8ead7' : '#f3e2ca';
    const rankText = String(row.rank ?? index + 1).padStart(2, '0');
    const team = String(row.team || '');
    const badgeX = starts[1] + 12;
    const badgeY = y + (rowHeight - 28) / 2;
    const logo = row.logo
      ? `<image href="${row.logo}" x="${badgeX}" y="${badgeY.toFixed(2)}" width="28" height="28" preserveAspectRatio="xMidYMid meet"/>`
      : team ? `<circle cx="${badgeX + 14}" cy="${badgeY + 14}" r="13" fill="#efe0c8" stroke="#6b5544" stroke-width="1.5"/>${templateTextPaths(template1JakartaBoldFont, team.charAt(0).toUpperCase(), badgeX + 14, badgeY + 19, 14, '#3b2e24', { anchor: 'middle', strokeWidth: 0.25 })}` : '';
    const name = truncateToWidth(template1JakartaBoldFont, team, 15, columns[1] - 74);
    const rowNumbers = [row.wins, row.killPoints, row.placementPoints, row.totalPoints];
    const values = rowNumbers.map((value, offset) => {
      const columnIndex = offset + 2;
      const center = starts[columnIndex] + columns[columnIndex] / 2;
      const number = value === '' || value === null || value === undefined ? '-' : String(value);
      const total = columnIndex === 5;
      return textPathsFit(
        template1JakartaBoldFont,
        number,
        center,
        y + rowHeight / 2 + (total ? 8 : 6),
        total ? 25 : 16.5,
        total ? '#c0471f' : '#1a1512',
        columns[columnIndex] - 22,
        { anchor: 'middle', strokeWidth: total ? 0.55 : 0.3 },
      );
    }).join('');
    const rankMarkup = `${isLeader ? `<circle cx="${tableX + 12}" cy="${(y + rowHeight / 2).toFixed(2)}" r="2.5" fill="#c24b21"/>` : ''}${textPathsFit(template1JakartaBoldFont, rankText, tableX + (isLeader ? 34 : 20), y + rowHeight / 2 + 5.5, 15.5, isLeader ? '#c24b21' : '#1a1614', 48, { strokeWidth: 0.45 })}`;
    const teamMarkup = textPathsFit(template1JakartaBoldFont, name, starts[1] + 52, y + rowHeight / 2 + 5.5, 15, '#171310', columns[1] - 72, { strokeWidth: 0.5, letterSpacing: 0.5 });
    const rowLines = [1, 2, 3, 4, 5].map(column => `<line x1="${starts[column]}" y1="${y.toFixed(2)}" x2="${starts[column]}" y2="${(y + rowHeight).toFixed(2)}" stroke="rgba(140,108,81,.34)" stroke-width="1"/>`).join('');
    return `<g><rect x="${tableX}" y="${y.toFixed(2)}" width="${tableWidth}" height="${rowHeight}" fill="${fill}"/><line x1="${tableX}" y1="${y.toFixed(2)}" x2="${tableX + tableWidth}" y2="${y.toFixed(2)}" stroke="rgba(140,108,81,.5)" stroke-width="1"/>${isLeader ? `<rect x="${tableX}" y="${y.toFixed(2)}" width="4" height="${rowHeight}" fill="#c24b21"/>` : ''}${rowLines}${rankMarkup}${logo}${teamMarkup}${values}</g>`;
  }).join('');
  const tableHeight = headerHeight + paddedRows.length * rowHeight;
  const brandLogo = templateAssetData(template4Brand, 'image/png');
  const tournamentName = truncateToWidth(template4BebasBold, subtitle, 38, 640);
  const titleFirst = title === 'MATCH RESULTS' ? 'MATCH' : 'OVERALL';
  const titleSecond = title === 'MATCH RESULTS' ? 'RESULTS' : 'STANDINGS';
  const titleOne = template4BebasBold.layout(titleFirst).positions.reduce((sum, position) => sum + position.xAdvance, 0) * 120 / template4BebasBold.unitsPerEm;
  const titleTwo = template4BebasBold.layout(titleSecond).positions.reduce((sum, position) => sum + position.xAdvance, 0) * 120 / template4BebasBold.unitsPerEm;
  const headerWidth = Math.max(titleOne, titleTwo, 520);
  const footerTop = tableY + tableHeight + 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <image href="${templateAssetData(template4Background, 'image/png')}" x="0" y="0" width="${width}" height="${height}"/>
    ${textPathsFit(template4BebasBold, tournamentName, 163, 122, 38, '#120e0c', 650, { letterSpacing: 1.5 })}
    ${textPathsFit(template4BebasBold, titleFirst, 163, 224, 120, '#14100e', headerWidth, { strokeWidth: 1.5, letterSpacing: 1 })}
    ${textPathsFit(template4BebasBold, titleSecond, 163, 326, 120, '#14100e', headerWidth, { strokeWidth: 1.5, letterSpacing: 1 })}
    <line x1="163" y1="344" x2="${163 + headerWidth}" y2="344" stroke="#806b58" stroke-width="1"/>
    ${textPathsFit(template1JakartaBoldFont, 'GAME:', 163, 372, 11.5, '#4b3e34', 42, { letterSpacing: 1.5 })}
    ${textPathsFit(template1JakartaBoldFont, brandGame.toUpperCase(), 208, 372, 11.5, '#181310', 350, { letterSpacing: 1.5, strokeWidth: 0.2 })}
    <defs><clipPath id="template4TableClip"><rect x="${tableX}" y="${tableY}" width="${tableWidth}" height="${tableHeight}" rx="6"/></clipPath></defs>
    <g clip-path="url(#template4TableClip)"><rect x="${tableX}" y="${tableY}" width="${tableWidth}" height="${headerHeight}" fill="#efd7b7"/><rect x="${starts[5]}" y="${tableY}" width="${columns[5]}" height="${headerHeight}" fill="#b84e22"/>${headerMarkup}${body}</g>
    <rect x="${tableX}" y="${tableY}" width="${tableWidth}" height="${tableHeight}" rx="6" fill="none" stroke="rgba(140,108,81,.5)" stroke-width="1.3"/>
    ${templateTextPaths(template1JakartaBoldFont, 'Made with', width / 2, footerTop + 16, 13, '#3b2e24', { anchor: 'middle', letterSpacing: 0.5 })}
    <image href="${brandLogo}" x="${width / 2 - 90}" y="${footerTop + 24}" width="180" height="30" preserveAspectRatio="xMidYMid meet"/>
  </svg>`;
}

function createStandingsTemplate5Svg({ eventName, rows }) {
  const width = 1080;
  const height = 1350;
  const x = 38;
  const tableY = 536;
  const tableWidth = 1004;
  const headerHeight = 56;
  const rowHeight = 41.75;
  const columnWidths = [68, 356, 145, 145, 145, 145];
  const columns = [x];
  columnWidths.forEach(columnWidth => columns.push(columns[columns.length - 1] + columnWidth));
  const paddedRows = [...rows.slice(0, 16)];
  while (paddedRows.length < 16) paddedRows.push({ rank: paddedRows.length + 1, team: '', wins: '', killPoints: '', placementPoints: '', totalPoints: '' });
  const eventTitle = String(eventName || 'Event').replace(/\s+/g, ' ').trim().slice(0, 48);
  const brandLogo = templateAssetData(template5Brand, 'image/png');
  const gameLogo = templateAssetData(template5FreeFire, 'image/png');
  const titleFont = template5PermanentMarker;
  // Sharp's SVG renderer may not have Arial installed (notably on Linux).
  // Outline all template text with an app-bundled font so the mobile preview
  // cannot degrade to missing-glyph boxes on devices or deployment hosts.
  const tableFont = template1JakartaBoldFont;
  const tableText = (text, x, y, size, color, options = {}) =>
    templateTextPaths(tableFont, text, x, y, size, color, options);
  const titleMarkup = (text, centerX, baseline, size, maxWidth, color) => {
    const layout = titleFont.layout(templateSafeText(titleFont, text));
    const naturalWidth = layout.positions.reduce((sum, position) => sum + position.xAdvance, 0) * size / titleFont.unitsPerEm;
    return templateTextPaths(titleFont, text, centerX, baseline, size * Math.min(1, maxWidth / Math.max(naturalWidth, 1)), color, { anchor: 'middle', letterSpacing: 0.3 });
  };
  const header = [
    tableText('#', columns[0] + columnWidths[0] / 2, tableY + 37, 26, '#fff', { anchor: 'middle' }),
    `<g fill="#fff"><circle cx="${columns[1] + 91}" cy="${tableY + 25}" r="7"/><circle cx="${columns[1] + 108}" cy="${tableY + 23}" r="7"/><circle cx="${columns[1] + 125}" cy="${tableY + 25}" r="7"/><path d="M${columns[1] + 78} ${tableY + 42}c0-8 6-12 13-12s13 4 13 12zm25 0c0-7 6-11 13-11 7 0 13 4 13 11z"/></g>${tableText('TEAM', columns[1] + 144, tableY + 34, 18, '#fff')}`,
    `<g transform="translate(${columns[2] + 48} ${tableY + 17})" fill="#fff"><path d="M2 2h6v4h8V2h6v4c0 6-4 9-8 10v4h5v3H5v-3h5v-4C6 15 2 12 2 6z"/></g>${tableText('WINS', columns[2] + 84, tableY + 35, 17, '#fff')}`,
    `<g transform="translate(${columns[3] + 14} ${tableY + 17})" fill="none" stroke="#fff" stroke-width="3"><circle cx="11" cy="11" r="9"/><path d="M11 0v6m0 10v6M0 11h6m10 0h6"/></g>${tableText('KILL', columns[3] + 73, tableY + 27, 15, '#fff', { anchor: 'middle' })}${tableText('POINTS', columns[3] + 73, tableY + 43, 12.5, '#fff', { anchor: 'middle' })}`,
    `<path d="M${columns[4] + 18} ${tableY + 18}l12 5v8c0 8-6 12-12 14-6-2-12-6-12-14v-8z" fill="#fff"/>${tableText('PLACEMENT', columns[4] + 91, tableY + 27, 13.5, '#fff', { anchor: 'middle' })}${tableText('POINTS', columns[4] + 91, tableY + 43, 12.5, '#fff', { anchor: 'middle' })}`,
    `<path d="M${columns[5] + 39} ${tableY + 15}l7 13 14 2-10 9 3 14-14-7-13 7 3-14-10-9 14-2z" transform="translate(0 -5) scale(.78)" fill="#fff"/>${tableText('TOTAL', columns[5] + 94, tableY + 27, 13.5, '#fff', { anchor: 'middle' })}${tableText('POINTS', columns[5] + 94, tableY + 43, 12.5, '#fff', { anchor: 'middle' })}`,
  ].join('');
  const body = paddedRows.map((row, index) => {
    const y = tableY + headerHeight + index * rowHeight;
    const team = String(row.team || '').slice(0, 40);
    const teamLogoX = columns[1] + 20;
    const teamLogoY = y + (rowHeight - 26) / 2;
    const logo = row.logo
      ? `<image href="${row.logo}" x="${teamLogoX}" y="${teamLogoY.toFixed(2)}" width="26" height="26" preserveAspectRatio="xMidYMid meet"/>`
      : team ? `<rect x="${teamLogoX}" y="${teamLogoY.toFixed(2)}" width="26" height="26" rx="4" fill="#ead8c5"/>${tableText(team.charAt(0).toUpperCase(), teamLogoX + 13, teamLogoY + 18, 14, '#4b3320', { anchor: 'middle' })}` : '';
    const values = [row.wins, row.killPoints, row.placementPoints, row.totalPoints].map((value, offset) => {
      const col = offset + 2;
      const shown = value === '' || value === null || value === undefined ? '-' : String(value);
      return tableText(shown, columns[col] + columnWidths[col] / 2, y + 27, 19, col === 5 ? '#f06400' : '#18181a', { anchor: 'middle' });
    }).join('');
    const name = team.toUpperCase();
    return `<g><rect x="${x}" y="${y.toFixed(2)}" width="${tableWidth}" height="${rowHeight}" fill="${index % 2 ? '#ede4d5' : '#f7ede1'}"/><rect x="${x}" y="${y.toFixed(2)}" width="${columnWidths[0]}" height="${rowHeight}" fill="#f06400"/><rect x="${columns[5]}" y="${y.toFixed(2)}" width="${columnWidths[5]}" height="${rowHeight}" fill="#171719"/><line x1="${x}" y1="${(y + rowHeight).toFixed(2)}" x2="${x + tableWidth}" y2="${(y + rowHeight).toFixed(2)}" stroke="rgba(130,105,83,.35)" stroke-width="1"/>${tableText(row.rank ?? index + 1, x + columnWidths[0] / 2, y + 27, 20, '#fff', { anchor: 'middle' })}${logo}${tableText(name, columns[1] + (team ? 58 : 20), y + 27, 16.5, '#18181a', { letterSpacing: 0.2 })}${values}</g>`;
  }).join('');
  const brushWidth = Math.max(340, Math.min(780, eventTitle.length * (eventTitle.length <= 10 ? 17 : 14.5) + 110));
  const leftDashes = `<g transform="translate(-46 10)" fill="#fba000"><polygon points="4,24 28,16 26,19 2,27"/><polygon points="10,36 34,31 32,34 8,39"/></g>`;
  const rightDashes = `<g transform="translate(${brushWidth + 12} 10)" fill="#fba000"><polygon points="4,16 28,24 26,27 2,19"/><polygon points="6,31 30,36 28,39 4,34"/></g>`;
  const brushPath = `M0,22 L2,19 L6,18 L10,18 L16,17 L22,17 L28,16 L36,15 L45,14 Q${brushWidth * 0.5},1 ${brushWidth - 55},6 L${brushWidth - 48},5 L${brushWidth - 36},6 L${brushWidth - 24},8 L${brushWidth - 14},8 L${brushWidth - 4},7 L${brushWidth},8 L${brushWidth - 12},17 L${brushWidth - 2},20 L${brushWidth - 8},25 L${brushWidth - 18},28 L${brushWidth - 6},32 L${brushWidth - 16},36 L${brushWidth - 4},40 L${brushWidth - 14},44 L${brushWidth - 22},46 L${brushWidth - 38},47 L${brushWidth - 55},48 Q${brushWidth * 0.5},54 45,51 L34,51 L24,50 L16,49 L10,48 L4,45 L8,38 L2,34 L7,28 L0,22 Z`;
  const tableHeight = headerHeight + paddedRows.length * rowHeight;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <image href="${templateAssetData(template5Background, 'image/png')}" x="0" y="0" width="${width}" height="${height}"/>
    <image href="${gameLogo}" x="38" y="34" width="260" height="38" preserveAspectRatio="xMinYMid meet"/>
    <defs><filter id="template5BrushShadow" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="#000000" flood-opacity=".6"/></filter></defs>
    <g transform="translate(395 458) rotate(-2.8)"><g transform="translate(${-brushWidth / 2} 0)">${leftDashes}${rightDashes}<path d="${brushPath}" fill="#fba000" filter="url(#template5BrushShadow)"/>${titleMarkup(eventTitle, brushWidth / 2, 32, 25, brushWidth - 28, '#08080a')}</g></g>
    <defs><clipPath id="template5TableClip"><rect x="${x}" y="${tableY}" width="${tableWidth}" height="${tableHeight}" rx="16"/></clipPath></defs>
    <g clip-path="url(#template5TableClip)"><rect x="${x}" y="${tableY}" width="${tableWidth}" height="${headerHeight}" fill="#ef4303"/><rect x="${columns[5]}" y="${tableY}" width="${columnWidths[5]}" height="${headerHeight}" fill="#171719"/>${header}${body}</g>
    <rect x="${x}" y="${tableY}" width="${tableWidth}" height="${tableHeight}" rx="16" fill="none" stroke="rgba(215,202,185,.55)" stroke-width="1.5"/>
    ${tableText('Made With', width / 2, 1285, 13, '#fff', { anchor: 'middle' })}
    <image href="${brandLogo}" x="${width / 2 - 82}" y="1292" width="164" height="34" preserveAspectRatio="xMidYMid meet"/>
  </svg>`;
}

function createTopShootersTemplateSvg(templateNumber, { eventName, rows }) {
  const template = topShooterTemplates[templateNumber - 1];
  const background = templateAssetData(template.background, 'image/png');
  const gameLogo = templateAssetData(template.gameLogo, 'image/png');
  const brandLogo = templateAssetData(template.brandLogo, 'image/png');
  const shooters = rows.slice(0, 5);
  const playerLabel = (value) => String(value || '').trim().split(/\s+/).slice(0, 1).join('').toUpperCase();
  const badge = (row, cx, y, size = 48, color = '#ffffff') => row.logo
    ? `<image href="${row.logo}" x="${cx - size / 2}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`
    : `<circle cx="${cx}" cy="${y + size / 2}" r="${size / 2}" fill="${color}" fill-opacity=".16" stroke="${color}" stroke-opacity=".45"/>${templateTextPaths(template1JakartaBoldFont, String(row.team || '').trim().slice(0, 2).toUpperCase(), cx, y + size * .68, Math.max(11, size * .28), color, { anchor: 'middle' })}`;
  const event = escapeXml(String(eventName || 'EVENT').trim().slice(0, 50).toUpperCase());
  let content = '';

  if (templateNumber === 1) {
    const centers = [137, 351, 566, 778, 992];
    content = shooters.map((row, index) => {
      const cx = centers[index];
      const player = playerLabel(row.player);
      const nameFont = player.length > 10 ? 21 : 26;
      return `<g>${templateTextPaths(template1JakartaBoldFont, player, cx, 899, nameFont, '#111827', { anchor: 'middle' })}${badge(row, cx, 931, 56, '#111827')}${templateTextPaths(template1JakartaBoldFont, String(row.team || '').toUpperCase().slice(0, 22), cx, 1013, 13, '#111827', { anchor: 'middle', letterSpacing: .25 })}${templateTextPaths(template1JakartaBoldFont, 'KILLS', cx, 1087, 16, '#334155', { anchor: 'middle', letterSpacing: 1 })}${templateTextPaths(template1BebasFont, row.kills, cx, 1166, 68, '#ff5801', { anchor: 'middle', letterSpacing: .5 })}</g>`;
    }).join('');
    const eventWidth = Math.min(760, Math.max(230, event.length * 11 + 42));
    const lead = 'COMPETE. SURVIVE.';
    const accent = 'BOOYAH!';
    const footerSize = 15;
    const advance = (text) => template1JakartaBoldFont.layout(text).positions.reduce((sum, item) => sum + item.xAdvance, 0) * footerSize / template1JakartaBoldFont.unitsPerEm + (text.length - 1) * .5;
    const leadWidth = advance(lead);
    const accentWidth = advance(accent);
    const footerStart = 1070 - leadWidth - 7 - accentWidth;
    content += `<g transform="translate(47 388) skewX(-24)"><rect width="${eventWidth}" height="36" fill="#ff5801"/>${templateTextPaths(template1JakartaBoldFont, event, 18, 24, 16.5, '#ffffff', { letterSpacing: .8 })}<path d="M${eventWidth + 12},2h6l-8,31h-6z M${eventWidth + 27},2h6l-8,31h-6z M${eventWidth + 42},2h6l-8,31h-6z" fill="#ff5801"/></g>${templateTextPaths(template1JakartaBoldFont, 'Made with', 54, 1341, 15, '#ffffff', { letterSpacing: .5 })}<image href="${brandLogo}" x="54" y="1346" width="180" height="29" preserveAspectRatio="xMinYMid meet" filter="brightness(0) invert(1)"/>${templateTextPaths(template1JakartaBoldFont, lead, footerStart, 1350, footerSize, '#111113', { letterSpacing: .5 })}${templateTextPaths(template1JakartaBoldFont, accent, footerStart + leadWidth + 7, 1350, footerSize, '#ff5801', { letterSpacing: .5 })}`;
  } else if (templateNumber === 2) {
    const slots = [
      { cx: 133.5, index: 3, size: 68 }, { cx: 345.5, index: 1, size: 68 },
      { cx: 563, index: 0, size: 82 }, { cx: 782.5, index: 2, size: 68 }, { cx: 992.5, index: 4, size: 68 },
    ];
    content = slots.map(({ cx, index, size }) => {
      const row = shooters[index];
      if (!row) return '';
      const player = playerLabel(row.player);
      return `<g>${templateTextPaths(template1JakartaBoldFont, player, cx, 949, player.length > 10 ? 20 : 24, '#111827', { anchor: 'middle' })}<line x1="${cx - 82}" y1="958" x2="${cx + 82}" y2="958" stroke="#dfd8cc" stroke-width="1.5"/>${badge(row, cx, 974, 48, '#111827')}${templateTextPaths(template1JakartaBoldFont, String(row.team || '').toUpperCase().slice(0, 21), cx, 1045, 13, '#111827', { anchor: 'middle', letterSpacing: .25 })}<line x1="${cx - 82}" y1="1057" x2="${cx + 82}" y2="1057" stroke="#dfd8cc" stroke-width="1.5"/>${templateTextPaths(template1JakartaBoldFont, 'KILLS', cx, 1101, 15, '#111827', { anchor: 'middle', letterSpacing: .8 })}${templateTextPaths(template1BebasFont, row.kills, cx, 1190, size, '#ff5801', { anchor: 'middle', letterSpacing: .5 })}</g>`;
    }).join('');
    content += `${templateTextPaths(template1JakartaBoldFont, event, template.width / 2, 435, 28, '#111827', { anchor: 'middle', letterSpacing: .5 })}<image href="${brandLogo}" x="52" y="1337" width="164" height="32" preserveAspectRatio="xMinYMid meet" filter="brightness(0) invert(1)"/>${templateTextPaths(template1JakartaSemiFont, 'Made With', 52, 1329, 16, '#ffffff', { letterSpacing: .3 })}`;
  } else {
    const cards = [
      { index: 3, cx: 122, y: 970 }, { index: 1, cx: 321, y: 970 },
      { index: 0, cx: 540, y: 960 }, { index: 2, cx: 760, y: 970 }, { index: 4, cx: 963, y: 970 },
    ];
    content = cards.map(({ index, cx, y }) => {
      const row = shooters[index];
      if (!row) return '';
      const lines = String(row.player || '').trim().toUpperCase().split(/\s+/).filter(Boolean).slice(0, 2);
      const isLeader = index === 0;
      const firstBaseline = y + (lines.length > 1 ? 25 : 38);
      const teamY = y + (lines.length > 1 ? 76 : 64);
      return `<g filter="url(#shadow)">${lines.map((line, lineIndex) => templateTextPaths(template4BebasBold, line, cx, firstBaseline + lineIndex * (isLeader ? 29 : 26), isLeader ? 34 : 30, '#ffffff', { anchor: 'middle', letterSpacing: 1.4, strokeWidth: 1.2 })).join('')}${badge(row, cx - 45, teamY - 13, 19, '#ffffff')}${templateTextPaths(template1JakartaBoldFont, String(row.team || '').toUpperCase().slice(0, 20), cx + 5, teamY + 1, isLeader ? 12 : 11, '#ffffff', { anchor: 'middle', letterSpacing: .7 })}${templateTextPaths(template1JakartaBoldFont, 'KILLS', cx, y + 124, isLeader ? 14.5 : 13.5, '#c6c8cd', { anchor: 'middle', letterSpacing: 1.5 })}${templateTextPaths(template1BebasFont, row.kills, cx, y + 208, isLeader ? 80 : 68, '#ff6a00', { anchor: 'middle', letterSpacing: -.5, strokeWidth: 1 })}</g>`;
    }).join('');
    content += `${templateTextPaths(template1JakartaBoldFont, 'Made With', 540, 1279, 13, '#ffffff', { anchor: 'middle', letterSpacing: .6 })}<image href="${brandLogo}" x="458" y="1284" width="164" height="25" preserveAspectRatio="xMidYMid meet" filter="brightness(0) invert(1)"/>`;
  }

  const logoY = templateNumber === 3 ? 42 : templateNumber === 2 ? 36 : 32;
  const logoWidth = templateNumber === 3 ? 220 : 220;
  const logoHeight = templateNumber === 3 ? 38 : templateNumber === 2 ? 26 : 25;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${template.width}" height="${template.height}" viewBox="0 0 ${template.width} ${template.height}"><defs><filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity=".8"/></filter></defs><image href="${background}" x="0" y="0" width="${template.width}" height="${template.height}"/><image href="${gameLogo}" x="${templateNumber === 3 ? 45 : 52}" y="${logoY}" width="${logoWidth}" height="${logoHeight}" preserveAspectRatio="xMinYMid meet"/>${content}</svg>`;
}

const renderTopShootersTemplate = (templateNumber) => async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.eventId)) return res.status(400).json({ message: 'Invalid event id.' });
    const query = { _id: req.params.eventId };
    if (req.user.role !== 'admin') query.organizerId = req.user._id;
    const event = await Event.findOne(query).populate('teams');
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (!Array.isArray(req.body.rows) || req.body.rows.length > 100) return res.status(400).json({ message: 'Invalid shooter rows.' });
    const teamByName = new Map((event.teams || []).filter(Boolean).map((team) => [String(team.name || '').trim().toLowerCase(), team]));
    const rows = await Promise.all(req.body.rows.slice(0, 5).map(async (row, index) => {
      const team = teamByName.get(String(row.team || '').trim().toLowerCase());
      const rawLogo = team?.logoUrl ? await loadTemplateTeamLogo(team.logoUrl) : '';
      return {
        rank: Math.max(1, Math.min(999, Number(row.rank) || index + 1)),
        player: String(row.player || '').slice(0, 80),
        team: String(row.team || '').slice(0, 80),
        kills: Math.max(0, Number(row.kills) || 0),
        logo: rawLogo ? escapeXml(rawLogo) : '',
      };
    }));
    if (!rows.length) return res.status(400).json({ message: 'There are no shooter results to export.' });
    const svg = createTopShootersTemplateSvg(templateNumber, { eventName: req.body.eventName || event.name, rows });
    let png = await sharp(Buffer.from(svg)).png().toBuffer();
    const values = req.body.adjustments || {};
    const adjustmentValue = (value, fallback) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const hue = Math.max(0, Math.min(360, adjustmentValue(values.hue, 0)));
    const brightness = Math.max(50, Math.min(150, adjustmentValue(values.brightness, 100)));
    const saturation = Math.max(0, Math.min(200, adjustmentValue(values.saturation, 100)));
    const contrast = Math.max(50, Math.min(150, adjustmentValue(values.contrast, 100)));
    if (hue || brightness !== 100 || saturation !== 100 || contrast !== 100) {
      png = await sharp(png).modulate({ hue, brightness, saturation }).linear(contrast / 100, 128 * (1 - contrast / 100)).png().toBuffer();
    }
    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    sendProgress(res, 0, 'Preparing top shooters');
    sendProgress(res, 80, 'Rendering template');
    const filename = `${safeFilename(event.name)}-top-shooters-template-${templateNumber}.png`;
    res.write(`${JSON.stringify({ type: 'complete', progress: 100, filename, mimeType: 'image/png', file: png.toString('base64') })}\n`);
    return res.end();
  } catch (error) {
    console.error('Top shooters template export failed:', error);
    return res.status(500).json({ message: 'Could not generate this top shooters image.' });
  }
};

const renderStandingsTemplate = (templateNumber) => async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.eventId)) return res.status(400).json({ message: 'Invalid event id.' });
    const query = { _id: req.params.eventId };
    if (req.user.role !== 'admin') query.organizerId = req.user._id;
    const event = await Event.findOne(query).populate('teams');
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (!Array.isArray(req.body.rows) || req.body.rows.length > 100) return res.status(400).json({ message: 'Invalid standings rows.' });

    const eventTeams = (event.teams || []).filter(Boolean);
    const teamByName = new Map(eventTeams.map(team => [String(team.name || '').trim().toLowerCase(), team]));
    const rowsToRender = req.body.rows.slice(0, 16).map((row, index) => {
      const team = teamByName.get(String(row.team || '').trim().toLowerCase());
      return {
        rank: Math.max(1, Math.min(999, Number(row.rank) || index + 1)),
        team: String(row.team || '').slice(0, 80),
        wins: Math.max(0, Number(row.wins) || 0),
        killPoints: Math.max(0, Number(row.killPoints) || 0),
        placementPoints: Math.max(0, Number(row.placementPoints) || 0),
        totalPoints: Math.max(0, Number(row.totalPoints) || 0),
        logoUrl: team?.logoUrl || '',
      };
    });
    const values = req.body.adjustments || {};
    const adjustmentValue = (value, fallback) => {
      if (value === undefined || value === null || value === '') return fallback;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const hue = Math.max(0, Math.min(360, adjustmentValue(values.hue, 0)));
    const brightness = Math.max(50, Math.min(150, adjustmentValue(values.brightness, 100)));
    const saturation = Math.max(0, Math.min(200, adjustmentValue(values.saturation, 100)));
    const contrast = Math.max(50, Math.min(150, adjustmentValue(values.contrast, 100)));
    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();
    sendProgress(res, 0, 'Preparing template');
    await yieldToServer();
    sendProgress(res, 10, 'Preparing standings');
    let processedRows = 0;
    const rows = await Promise.all(rowsToRender.map(async (row) => {
      const logo = row.logoUrl ? await loadTemplateTeamLogo(row.logoUrl) : '';
      processedRows += 1;
      sendProgress(res, 10 + Math.floor((processedRows / Math.max(rowsToRender.length, 1)) * 65), `Preparing team ${processedRows} of ${rowsToRender.length}`);
      await yieldToServer();
      return { ...row, logo: escapeXml(logo) };
    }));
    sendProgress(res, 82, 'Rendering template');
    const eventName = String(req.body.eventName || event.name).slice(0, 60);
    const renderers = {
      1: createStandingsTemplate1Svg,
      2: createStandingsTemplate2Svg,
      3: createStandingsTemplate3Svg,
      4: createStandingsTemplate4Svg,
      5: createStandingsTemplate5Svg,
    };
    const title = req.body.title === 'MATCH RESULTS' ? 'MATCH RESULTS' : undefined;
    const svg = renderers[templateNumber]({ eventName, gameName: event.game, rows, title });
    let png = await sharp(Buffer.from(svg)).png().toBuffer();
    if (hue || brightness !== 100 || saturation !== 100 || contrast !== 100) {
      png = await sharp(png).modulate({ hue, brightness, saturation }).linear(contrast / 100, 128 * (1 - contrast / 100)).png().toBuffer();
    }
    sendProgress(res, 96, 'Finishing image');
    const filename = `${safeFilename(event.name)}-${title ? 'match-results' : 'standings'}${templateNumber === 1 ? '' : `-template-${templateNumber}`}.png`;
    res.write(`${JSON.stringify({ type: 'complete', progress: 100, filename, mimeType: 'image/png', file: png.toString('base64') })}\n`);
    return res.end();
  } catch (error) {
    console.error('Standings template export failed:', error);
    if (res.headersSent) {
      res.write(`${JSON.stringify({ type: 'error', message: 'Could not generate this standings image.' })}\n`);
      return res.end();
    }
    return res.status(500).json({ message: 'Could not generate this standings image.' });
  }
};

router.post('/events/:eventId/standings-template-1', renderStandingsTemplate(1));
router.post('/events/:eventId/standings-template-2', renderStandingsTemplate(2));
router.post('/events/:eventId/standings-template-3', renderStandingsTemplate(3));
router.post('/events/:eventId/standings-template-4', renderStandingsTemplate(4));
router.post('/events/:eventId/standings-template-5', renderStandingsTemplate(5));
router.post('/events/:eventId/top-shooters-template-1', renderTopShootersTemplate(1));
router.post('/events/:eventId/top-shooters-template-2', renderTopShootersTemplate(2));
router.post('/events/:eventId/top-shooters-template-3', renderTopShootersTemplate(3));

// Mobile clients resolve templates through the shared platform catalog rather
// than shipping a list of template-specific export routes in each app build.
router.post('/events/:eventId/template/:templateKey', async (req, res, next) => {
  try {
    const template = await PlatformTemplate.findOne({ templateKey: req.params.templateKey }).lean();
    if (!template?.exportKey) return res.status(404).json({ message: 'This template is not available for mobile export.' });
    const renderer = PLATFORM_TEMPLATE_RENDERERS[template.exportKey];
    if (!renderer) return res.status(404).json({ message: 'This template has no compatible mobile renderer yet.' });
    return renderer(req, res, next);
  } catch (error) {
    return next(error);
  }
});

// Add a renderer here when publishing a new platform template. Mobile clients
// discover the template via the shared catalog, so this does not require an
// app release.
const PLATFORM_TEMPLATE_RENDERERS = {
  'standings-template-1': renderStandingsTemplate(1),
  'standings-template-2': renderStandingsTemplate(2),
  'standings-template-3': renderStandingsTemplate(3),
  'standings-template-4': renderStandingsTemplate(4),
  'standings-template-5': renderStandingsTemplate(5),
  'top-shooters-template-1': renderTopShootersTemplate(1),
  'top-shooters-template-2': renderTopShootersTemplate(2),
  'top-shooters-template-3': renderTopShootersTemplate(3),
};

router.post('/events/:eventId/teams-export', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.eventId)) {
      return res.status(400).json({ message: 'Invalid event id.' });
    }
    const eventQuery = { _id: req.params.eventId };
    if (req.user.role !== 'admin') eventQuery.organizerId = req.user._id;
    const event = await Event.findOne(eventQuery)
      .populate('teams')
      .populate('organizerId', 'name organization');
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const format = req.query.format === 'excel' ? 'excel' : 'image';
    const eventTeams = (event.teams || []).filter(Boolean);
    if (!eventTeams.length) return res.status(400).json({ message: 'This event has no teams to export.' });
    const teams = format === 'image' ? eventTeams.slice(0, 16) : eventTeams;
    const organizer = event.organizerId;
    const organizerName = organizer?.organization?.name?.trim() || organizer?.name?.trim() || '';

    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    sendProgress(res, 0, 'Preparing export');
    await yieldToServer();
    sendProgress(res, 5, 'Preparing export');

    if (format === 'excel') {
      const rows = [];
      for (let index = 0; index < teams.length; index += 1) {
        const team = teams[index];
        rows.push([
          String(index + 1),
          team.name || '',
          (team.players || []).map((player) => player.name).filter(Boolean).join(', '),
        ]);
        sendProgress(res, 5 + Math.floor(((index + 1) / teams.length) * 75), 'Preparing team rows');
        await yieldToServer();
      }
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([['Slot No.', 'Team', 'Players'], ...rows]);
      worksheet['!cols'] = [{ wch: 12 }, { wch: 32 }, { wch: 72 }];
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Event Teams');
      sendProgress(res, 90, 'Creating spreadsheet');
      await yieldToServer();
      const file = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.write(`${JSON.stringify({ type: 'complete', progress: 100, filename: `${safeFilename(event.name)}-teams.xlsx`, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', file: file.toString('base64') })}\n`);
      return res.end();
    }

    const rowMarkup = [];
    for (let index = 0; index < teams.length; index += 1) {
      const team = teams[index];
      // Build each row incrementally so progress reflects server-completed roster work.
      rowMarkup.push(team);
      sendProgress(res, 5 + Math.floor(((index + 1) / teams.length) * 75), `Rendering team ${index + 1} of ${teams.length}`);
      await yieldToServer();
    }
    sendProgress(res, 85, 'Encoding PNG');
    const svg = createTeamsSvg(event, rowMarkup, organizerName);
    const file = await sharp(Buffer.from(svg)).png().toBuffer();
    res.write(`${JSON.stringify({ type: 'complete', progress: 100, filename: `${safeFilename(event.name)}-teams.png`, mimeType: 'image/png', file: file.toString('base64') })}\n`);
    return res.end();
  } catch (error) {
    console.error('Event team export failed:', error);
    if (res.headersSent) {
      res.write(`${JSON.stringify({ type: 'error', message: 'Could not generate this export.' })}\n`);
      return res.end();
    }
    return res.status(500).json({ message: 'Could not generate this export.' });
  }
});

module.exports = router;
