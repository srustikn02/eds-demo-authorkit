import { getMetadata } from '../../scripts/ak.js';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
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

export default async function init(el) {
  const categoryMap = await fetchTaxonomy('categories');

  const featuredPosts = await fetchFeaturedPosts();

  let post;
  if (featuredPosts.length) {
    [post] = featuredPosts;
  } else {
    post = {
      title: getMetadata('og:title') || document.title,
      author: getMetadata('author'),
      'publication-date': getMetadata('publication-date'),
      category: getMetadata('category'),
      image: getMetadata('og:image'),
      description: getMetadata('description') || getMetadata('og:description'),
      path: window.location.pathname,
      featured: getMetadata('featured'),
    };
    if (String(post.featured).toLowerCase() !== 'true') {
      el.innerHTML = '';
      return;
    }
  }

  el.innerHTML = renderPost(post, categoryMap);
}