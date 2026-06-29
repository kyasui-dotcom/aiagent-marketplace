export const DEVELOPER_ACCESS_HREF = '/ai-agent-api.html';

export const HOME_NAV_LINKS = Object.freeze([
  { label: 'Chat', href: '/login?next=%2Fchat&source=nav' },
  { label: 'Agents', href: '/agents.html' },
  { label: 'Apps', href: '/apps.html' },
  { label: 'Deliveries', href: '/delivery-manager.html' },
  { label: 'Donate', href: '/pricing.html' },
  { label: 'API / CLI / MCP', href: DEVELOPER_ACCESS_HREF },
  { label: 'Resources', href: '/resources.html' },
  { label: 'Help', href: '/help.html' },
  { label: 'News', href: '/news.html' }
]);

export const DOC_NAV_LINKS = Object.freeze([
  { label: 'Home', href: '/' },
  { label: 'Chat', href: '/chat.html' },
  { label: 'Agents', href: '/agents.html' },
  { label: 'API / CLI / MCP', href: DEVELOPER_ACCESS_HREF },
  { label: 'Resources', href: '/resources.html' },
  { label: 'Help', href: '/help.html' },
  { label: 'News', href: '/news.html' }
]);

export const CHAT_PAGE_LINKS = Object.freeze([
  { label: 'Agent directory', href: '/agents.html' },
  { label: 'Apps hub', href: '/apps.html' },
  { label: 'Deliveries', href: '/delivery-manager.html' },
  { label: 'Account settings', href: '/account-settings.html' },
  { label: 'API / CLI / MCP', href: DEVELOPER_ACCESS_HREF },
  { label: 'Resources', href: '/resources.html' },
  { label: 'Help', href: '/help.html' },
  { label: 'News', href: '/news.html' },
  { label: 'Admin', href: '/admin', id: 'adminNavLink', hidden: true }
]);

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function anchorHtml(link, { className = '', indent = '' } = {}) {
  const attrs = [
    `href="${escapeHtml(link.href)}"`,
    className ? `class="${escapeHtml(className)}"` : '',
    link.id ? `id="${escapeHtml(link.id)}"` : '',
    link.hidden ? 'hidden' : ''
  ].filter(Boolean).join(' ');
  return `${indent}<a ${attrs}>${escapeHtml(link.label)}</a>`;
}

export function renderHomeNavLinks({ indent = '        ' } = {}) {
  return HOME_NAV_LINKS.map((link) => anchorHtml(link, { indent })).join('\n');
}

export function renderDocNavLinks({ indent = '        ' } = {}) {
  return DOC_NAV_LINKS
    .map((link) => anchorHtml(link, { className: 'mini-btn link-btn', indent }))
    .join('\n');
}

export function renderChatPageLinks({ indent = '                ' } = {}) {
  return CHAT_PAGE_LINKS.map((link) => anchorHtml(link, { indent })).join('\n');
}

export function renderHomeHeader() {
  return `    <header class="home-nav">
      <a class="logo logo-link" href="/" aria-label="Back to CAIt AI agent services start">
        <img src="/cait-icon.svg" alt="" />
        <span>CAIt AI agent services</span>
      </a>
      <nav class="home-links" aria-label="CAIt pages">
${renderHomeNavLinks()}
      </nav>
    </header>`;
}

export function renderDocHeader({ sublogo = 'AI AGENT RUNTIME' } = {}) {
  return `    <header class="topbar box">
      <div>
        <a class="logo logo-link" href="/" aria-label="Back to CAIt start">CAIt</a>
        <div class="sublogo">${escapeHtml(sublogo)}</div>
      </div>
      <nav class="doc-nav" aria-label="CAIt pages">
${renderDocNavLinks()}
      </nav>
    </header>`;
}

export function renderChatPagesNav() {
  return `              <nav class="chatux-menu-section chatux-nav" aria-label="CAIt pages">
                <div class="chatux-menu-label">Pages</div>
${renderChatPageLinks()}
              </nav>`;
}
