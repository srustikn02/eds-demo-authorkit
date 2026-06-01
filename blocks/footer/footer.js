import { getConfig, getMetadata } from '../../scripts/ak.js';
import { loadFragment } from '../fragment/fragment.js';

const FOOTER_PATH = '/fragments/nav';

/**
 * loads and decorates the footer
 * @param {Element} el The footer element
 */
export default async function init(el) {
  const { locale } = getConfig();
  const footerMeta = getMetadata('footer');
  const path = footerMeta || FOOTER_PATH;
  try {
    const fragment = await loadFragment(`${path}${locale.prefix}/footer`);
    fragment.classList.add('footer-content');

    const sections = [...fragment.querySelectorAll('.section')];

    // Last section = copyright + legal bar
    const bottom = sections.pop();
    if (bottom) bottom.classList.add('section-bottom');

    // Remaining first section = brand + social
    const top = sections[0];
    if (top) top.classList.add('section-top');

    el.append(fragment);
  } catch (e) {
    throw Error(e);
  }
}
