import { getMetadata } from '../../scripts/ak.js';


function parseCategories(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [String(raw)];
  try { return JSON.parse(raw); } catch { /* not JSON */ }
  return raw.split(',').map((t) => t.trim()).filter(Boolean);
}

function formatDate(value) {
  if (!value) return '';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function fetchTaxonomy(sheet) {
  try {
    const resp = await fetch(`/blog/taxonomy.json?sheet=${sheet}`);
    if (!resp.ok) return {};
    const json = await resp.json();
    const rows = json.data || (json[sheet] && json[sheet].data) || [];
    const map = {};
    rows.forEach((r) => {
      const name = r.Category || r.Tag || r.Name;
      const slug = r.Slug;
      if (name && slug) map[name.trim().toLowerCase()] = slug;
    });
    return map;
  } catch (e) {
    return {};
  }
}

async function fetchFeaturedPosts() {
  try {
    const resp = await fetch('/blog/query-index.json');
    if (!resp.ok) return [];
    const json = await resp.json();
    const rows = json.data || [];
    return rows.filter((r) => String(r.featured).toLowerCase() === 'true');
  } catch (e) {
    return [];
  }
}

function renderPost(post, categoryMap) {
  const title = post.title || '';
  const author = post.author || '';
  const authorSlug = author ? author.toLowerCase().replace(/\s+/g, '-') : '';
  const date = formatDate(post['publication-date'] || post.date);
  const category = (post.category || '').split(',')[0].trim();
  const categorySlug = categoryMap[category.toLowerCase()] || category.toLowerCase().replace(/\s+/g, '-');
  const image = post.image || '';
  const description = post.description || '';
  const path = post.path || '#';

  return `
    <div class="blog-hero-content">
      <h2 class="blog-hero-title">
        <a href="${path}">${title}</a>
      </h2>
      <hr class="blog-hero-separator" />
      <div class="blog-hero-meta">
        ${date ? `<span class="blog-hero-date">${date}</span>` : ''}
        ${author ? `<span class="blog-hero-divider">|</span><span class="blog-hero-author">By <a href="/author/${authorSlug}">${author}</a></span>` : ''}
        ${category ? `<span class="blog-hero-divider">|</span><a href="/blog/?category=${encodeURIComponent(categorySlug)}" class="blog-hero-tag">${category}</a>` : ''}
      </div>
      ${description ? `<p class="blog-hero-excerpt">${description}</p>` : ''}
      <p class="blog-hero-cta"><a href="${path}">Read More</a></p>
    </div>
    <div class="blog-hero-image">
      ${(image && !image.includes('default-meta-image')) ? `<img src="${image.split('?')[0]}?width=750&format=webply&optimize=medium" alt="${title}" loading="eager" />` : ''}
    </div>
  `;
}

async function fetchMetadata(metadataUrl, basePath) {
  try {
    const resp = await fetch(metadataUrl);
    if (!resp.ok) return {};
    const json = await resp.json();
    const map = {};
    for (const row of (json.data || [])) {
      if (row.URL && !row.URL.includes('*')) map[`${basePath}${row.URL}`] = row;
    }
    return map;
  } catch { return {}; }
}

export default async function init(el) {

  const sourceLink = el.querySelector('a')?.href;
  el.innerHTML = '';
  if (!sourceLink) return;


  // Derive base folder & metadata URL from the source link
  const sourceUrl = new URL(sourceLink);
  const basePath = sourceUrl.pathname.replace(/\/query-index\.json$/, '');
  const metadataUrl = `${sourceUrl.origin}${basePath}/metadata.json`;

  let post = null;
  try {
    const [resp, meta] = await Promise.all([
      fetch(sourceLink),
      fetchMetadata(metadataUrl, basePath),
    ]);
    if (!resp.ok) return;
    const json = await resp.json();
    const hasVal = (v) => v && !(Array.isArray(v) && !v.length);

    let posts = (json.data || []).map((p) => {
      const extra = meta[p.path] || {};
      return {
        ...p,
        author: p.author || extra.author || '',
        date: p.date || p['publication-date'] || extra['publication-date'] || '',
        category: hasVal(p.category) ? p.category : (extra.category || extra['article:tag'] || ''),
        featured: p.featured || extra.featured || '',
        image: (p.image && !p.image.includes('default-meta-image'))
          ? p.image
          : (extra['og:image'] || extra['og-image'] || extra.image || ''),
      };
    });

    posts = posts.filter((p) => String(p.featured).toLowerCase() === 'true');
    posts.sort((a, b) => (new Date(b.date) - new Date(a.date)));
    [post] = posts;
  } catch (e) {
    return;
  }


  if (!post) return;

  const categories = parseCategories(post.category);
  const date = formatDate(post.date);
  const authorSlug = post.author ? post.author.toLowerCase().replace(/\s+/g, '-') : '';

  el.innerHTML = `
    <div class="blog-hero-content">
      <h2 class="blog-hero-title">
        <a href="${post.path}">${post.title}</a>
      </h2>
      <hr class="blog-hero-separator" />
      <div class="blog-hero-meta">
        <span class="blog-hero-date">${date}</span>
        ${post.author ? `<span class="blog-hero-divider">|</span><span class="blog-hero-author">By <a href="/author/${authorSlug}">${post.author}</a></span>` : ''}
        ${categories.length ? `<span class="blog-hero-divider">|</span><a href="${basePath}/?category=${encodeURIComponent(categories[0])}" class="blog-hero-tag">${categories[0]}</a>` : ''}
      </div>
      ${post.description ? `<p class="blog-hero-excerpt">${post.description}</p>` : ''}
      <p class="blog-hero-cta"><a href="${post.path}">Read More</a></p>
    </div>
    <div class="blog-hero-image">
      ${(post.image && !post.image.includes('default-meta-image')) ? `<img src="${post.image.split('?')[0]}?width=750&format=webply&optimize=medium" alt="${post.title}" loading="eager" />` : ''}
    </div>
  `;
}