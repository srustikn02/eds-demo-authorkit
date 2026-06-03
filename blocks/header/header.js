import { getConfig, getMetadata } from '../../scripts/ak.js';
import { loadFragment } from '../fragment/fragment.js';
import { setColorScheme } from '../section-metadata/section-metadata.js';

const { locale } = getConfig();

const HEADER_PATH = '/fragments/nav/header';
const HEADER_ACTIONS = [
  '/tools/widgets/scheme',
  '/tools/widgets/language',
  '/tools/widgets/toggle',
];

function closeAllMenus() {
  const openMenus = document.body.querySelectorAll('header .is-open');
  for (const openMenu of openMenus) {
    openMenu.classList.remove('is-open');
  }
}

function docClose(e) {
  if (e.target.closest('header')) return;
  closeAllMenus();
}

function toggleMenu(menu) {
  const isOpen = menu.classList.contains('is-open');
  closeAllMenus();
  if (isOpen) {
    document.removeEventListener('click', docClose);
    return;
  }

  // Setup the global close event
  document.addEventListener('click', docClose);
  menu.classList.add('is-open');
}

function normalizeLanguageHref(href) {
  try {
    const url = new URL(href, window.location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return href.replace(/#.*$/, '');
  }
}

function getLocalePrefixFromHref(href) {
  const normalized = normalizeLanguageHref(href);
  const parts = normalized.split('/').filter(Boolean);

  if (!parts.length) return '';

  const first = parts[0];
  return /^[a-z]{2}(-[a-z]{2})?$/i.test(first) ? `/${first}` : '';
}

function getLanguageItems(nav) {
  return [...nav.querySelectorAll(':scope > li')]
    .map((item) => {
      const link = item.querySelector('a');
      if (!link) return null;

      const href = link.getAttribute('href') || '';

      return {
        label: item.textContent.trim(),
        href: normalizeLanguageHref(href),
        localePrefix: getLocalePrefixFromHref(href),
      };
    })
    .filter(Boolean);
}

function getActiveLanguage(items) {
  const { pathname } = window.location;

  return items.find((item) => (
    item.localePrefix
      && (pathname === item.localePrefix
      || pathname.startsWith(`${item.localePrefix}/`))
  )) || items[0];
}

async function decorateLanguage(btn) {
  const section = btn.closest('.section');

  let selector = section.querySelector('.country-selector');

  if (!selector) {
    const fragment = await loadFragment(
      `${locale.prefix}${HEADER_PATH}/languages`,
    );

    const nav = fragment.querySelector('ul');
    if (!nav) return;

    const languageItems = getLanguageItems(nav);
    const activeLanguage = getActiveLanguage(languageItems);

    selector = document.createElement('aside');
    selector.className = 'country-selector';
    selector.setAttribute('data-wg-notranslate', '');
    selector.setAttribute('tabindex', '0');
    selector.setAttribute(
      'aria-label',
      `Language selected: ${activeLanguage?.label || ''}`,
    );

    const inputId = `language-selector-${Date.now()}`;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = inputId;
    input.className = 'language-choice';

    const label = document.createElement('label');
    label.className = 'wgcurrent';
    label.setAttribute('for', inputId);

    const currentLanguage = document.createElement('span');
    currentLanguage.className = 'wglanguage-name';
    currentLanguage.textContent = activeLanguage?.label || '';

    label.append(currentLanguage);

    const list = document.createElement('ul');

    languageItems.forEach((item) => {
      if (item.href === activeLanguage?.href) return;

      const li = document.createElement('li');

      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;

      li.append(a);
      list.append(li);
    });

    selector.append(input);
    selector.append(label);
    selector.append(list);

    const wrapper = btn.closest('.action-wrapper');
    wrapper.innerHTML = '';
    wrapper.append(selector);
  }
}

function decorateScheme(btn) {
  btn.addEventListener('click', async () => {
    const { body } = document;

    let currPref = localStorage.getItem('color-scheme');
    if (!currPref) {
      currPref = matchMedia('(prefers-color-scheme: dark)')
        .matches ? 'dark-scheme' : 'light-scheme';
    }

    const theme = currPref === 'dark-scheme'
      ? { add: 'light-scheme', remove: 'dark-scheme' }
      : { add: 'dark-scheme', remove: 'light-scheme' };

    body.classList.remove(theme.remove);
    body.classList.add(theme.add);
    localStorage.setItem('color-scheme', theme.add);
    // Re-calculatie section schemes
    const sections = document.querySelectorAll('.section');
    for (const section of sections) {
      setColorScheme(section);
    }
  });
}

function decorateNavToggle(btn) {
  btn.addEventListener('click', () => {
    const header = document.body.querySelector('header');
    if (header) header.classList.toggle('is-mobile-open');
  });
}

async function decorateAction(header, pattern) {
  const link = header.querySelector(`[href*="${pattern}"]`);
  if (!link) return;

 const icon = link.querySelector('.icon');
const text = link.textContent;
const btn = document.createElement('button');

if (pattern !== '/tools/widgets/language') {
  if (icon) btn.append(icon);

  if (text) {
    const textSpan = document.createElement('span');
    textSpan.className = 'text';
    textSpan.textContent = text;
    btn.append(textSpan);
  }
}
  const wrapper = document.createElement('div');
  const iconName = icon?.classList?.[1]?.replace('icon-', '') || 'language';
  wrapper.className = `action-wrapper ${iconName}`;
  wrapper.append(btn);
  link.parentElement.parentElement.replaceChild(wrapper, link.parentElement);

  if (pattern === '/tools/widgets/language') decorateLanguage(btn);
  if (pattern === '/tools/widgets/scheme') decorateScheme(btn);
  if (pattern === '/tools/widgets/toggle') decorateNavToggle(btn);
}

function decorateMenu() {
  // TODO: finish single menu support
  return null;
}

function decorateMegaMenu(li) {
  const menu = li.querySelector('.fragment-content');
  if (!menu) return null;
  const wrapper = document.createElement('div');
  wrapper.className = 'mega-menu';
  wrapper.append(menu);
  li.append(wrapper);
  return wrapper;
}

function decorateNavItem(li) {
  li.classList.add('main-nav-item');
  const link = li.querySelector(':scope > p > a');
  if (link) link.classList.add('main-nav-link');
  const menu = decorateMegaMenu(li) || decorateMenu(li);
  if (!(menu || link)) return;
  link.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMenu(li);
  });
}

function decorateBrandSection(section) {
  section.classList.add('brand-section');
  const brandLink = section.querySelector('a');
  const [, text] = brandLink.childNodes;
  const span = document.createElement('span');
  span.className = 'brand-text';
  span.append(text);
  brandLink.append(span);
}

function decorateNavSection(section) {
  section.classList.add('main-nav-section');
  const navContent = section.querySelector('.default-content');
  const navList = section.querySelector('ul');
  if (!navList) return;
  navList.classList.add('main-nav-list');

  const nav = document.createElement('nav');
  nav.append(navList);
  navContent.append(nav);

  const mainNavItems = section.querySelectorAll('nav > ul > li');
  for (const navItem of mainNavItems) {
    decorateNavItem(navItem);
  }
}

async function decorateActionSection(section) {
  section.classList.add('actions-section');
}

async function decorateHeader(fragment) {
  const sections = fragment.querySelectorAll(':scope > .section');
  if (sections[0]) decorateBrandSection(sections[0]);
  if (sections[1]) decorateNavSection(sections[1]);
  if (sections[2]) decorateActionSection(sections[2]);

  for (const pattern of HEADER_ACTIONS) {
    decorateAction(fragment, pattern);
  }
}

/**
 * loads and decorates the header
 * @param {Element} el The header element
 */
export default async function init(el) {
  const headerMeta = getMetadata('header');
  const path = headerMeta || HEADER_PATH;
  try {
    const fragment = await loadFragment(`${locale.prefix}${path}`);
    fragment.classList.add('header-content');
    await decorateHeader(fragment);
    el.append(fragment);
  } catch (e) {
    throw Error(e);
  }
}