/**
 * Shared markdown / text context block for tracker issue bodies.
 * Never embeds data-URL screenshots (trackers strip them / bloated).
 * @param {object} report
 */
export function formatContextMarkdown(report) {
  const lines = [
    report.message || '',
    '',
    '---',
    '',
    `**Type:** ${report.type}`,
    `**Report ID:** ${report.id}`,
    `**When:** ${report.createdAt}`,
  ];

  if (report.email) lines.push(`**Email:** ${report.email}`);
  if (report.page?.url) lines.push(`**URL:** \`${report.page.url}\``);
  if (report.page?.title) lines.push(`**Page title:** ${report.page.title}`);
  if (report.browser?.userAgent) lines.push(`**UA:** \`${report.browser.userAgent}\``);
  if (report.viewport) {
    lines.push(
      `**Viewport:** ${report.viewport.innerWidth}×${report.viewport.innerHeight} @${report.viewport.devicePixelRatio} (${report.viewport.colorScheme})`,
    );
  }

  if (report.metadata && Object.keys(report.metadata).length) {
    lines.push('', '### Metadata', '```json', JSON.stringify(report.metadata, null, 2), '```');
  }

  if (report.errors?.length) {
    lines.push('', '### Recent errors');
    for (const e of report.errors.slice(-10)) {
      lines.push(`- \`${e.message}\`${e.stack ? `\n\`\`\`\n${String(e.stack).slice(0, 800)}\n\`\`\`` : ''}`);
    }
  }

  if (report.console?.length) {
    lines.push('', '### Console (tail)');
    lines.push('```');
    for (const c of report.console.slice(-30)) {
      lines.push(`[${c.level}] ${c.message}`);
    }
    lines.push('```');
  }

  if (report.network?.length) {
    lines.push('', '### Failed network');
    for (const n of report.network.slice(-20)) {
      lines.push(`- ${n.method} ${n.url} → ${n.status ?? n.error ?? '?'}`);
    }
  }

  if (report.screenshot?.status === 'captured') {
    lines.push(
      '',
      '### Screenshot',
      `Captured (${report.screenshot.mime || 'image'}, ~${report.screenshot.bytes ?? '?'} bytes, method=${report.screenshot.method || '?'}).`,
      '_Inline data-URL omitted (not supported by most trackers). Full image is in the raw JSON payload when using webhook/url forwarders._',
    );
  } else if (report.screenshot?.status) {
    lines.push('', `### Screenshot: ${report.screenshot.status}`);
  }

  if (report.actions?.length) {
    lines.push('', '### Actions');
    for (const a of report.actions) {
      lines.push(`- ${a.ts} ${a.type} ${a.target || ''}`);
    }
  }

  return lines.join('\n');
}

/**
 * Minimal markdown → ADF for Jira Cloud (paragraphs + hardBreaks).
 * @param {string} markdown
 */
export function markdownToSimpleAdf(markdown) {
  const text = String(markdown || '').slice(0, 30000);
  const paragraphs = text.split(/\n{2,}/);
  return {
    type: 'doc',
    version: 1,
    content: paragraphs.map((block) => {
      const lines = block.split('\n');
      const content = [];
      lines.forEach((line, i) => {
        if (line) content.push({ type: 'text', text: line });
        if (i < lines.length - 1) content.push({ type: 'hardBreak' });
      });
      if (!content.length) content.push({ type: 'text', text: ' ' });
      return { type: 'paragraph', content };
    }),
  };
}

/**
 * Escape HTML for Azure DevOps rich text fields.
 * @param {string} s
 */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @param {string} markdown
 */
export function markdownToSimpleHtml(markdown) {
  const escaped = escapeHtml(markdown);
  return `<div>${escaped.replace(/\n/g, '<br/>')}</div>`;
}

export function typeToIssueKind(type) {
  switch (type) {
    case 'bug':
      return 'bug';
    case 'suggestion':
      return 'enhancement';
    case 'help':
      return 'support';
    case 'question':
      return 'question';
    default:
      return type || 'task';
  }
}

/**
 * Safe string slice by code points.
 * @param {string} s
 * @param {number} n
 */
export function sliceChars(s, n) {
  return Array.from(String(s || ''))
    .slice(0, n)
    .join('');
}
