/**
 * Shared markdown / text context block for tracker issue bodies.
 * @param {import('../index.js').ReportPayload} report
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
  if (report.page?.url) lines.push(`**URL:** ${report.page.url}`);
  if (report.page?.title) lines.push(`**Page title:** ${report.page.title}`);
  if (report.browser?.userAgent) lines.push(`**UA:** ${report.browser.userAgent}`);
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
      lines.push(`- \`${e.message}\`${e.stack ? `\n\`\`\`\n${e.stack.slice(0, 800)}\n\`\`\`` : ''}`);
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
      `### Screenshot`,
      `Captured (${report.screenshot.mime}, ~${report.screenshot.bytes} bytes, method=${report.screenshot.method}).`,
      report.screenshot.dataUrl && report.screenshot.dataUrl.length < 50_000
        ? `![screenshot](${report.screenshot.dataUrl})`
        : '_Screenshot attached in raw payload / omitted here due to size._',
    );
  } else if (report.screenshot?.status) {
    lines.push('', `### Screenshot: ${report.screenshot.status}`);
  }

  // Reserved for post-V1 action trail
  if (report.actions?.length) {
    lines.push('', '### Actions');
    for (const a of report.actions) {
      lines.push(`- ${a.ts} ${a.type} ${a.target || ''}`);
    }
  }

  return lines.join('\n');
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
