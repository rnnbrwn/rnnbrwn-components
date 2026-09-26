/**
 * A link from WordPress, ready for the site. Links to the CMS's own pages (what WordPress's
 * link box and page picker give, e.g. https://cms.example.com/about/) become site links
 * (/about/), because pages are served by the site, not the CMS. The page with the slug
 * "home" is the site's home page, so /home/ becomes /. Links to uploaded files
 * (/wp-content/...) and to other websites are left alone.
 */
export function siteLink(url: string | null | undefined, cmsUrl?: string) {
  if (!url) return '';
  if (!cmsUrl) return url;
  const origin = new URL(cmsUrl).origin;
  if (!url.startsWith(origin)) return url;
  const rest = url.slice(origin.length);
  if (rest === '') return '/';
  if (!/^[/?#]/.test(rest) || rest.startsWith('/wp-content/')) return url;
  return (rest.startsWith('/') ? rest : `/${rest}`).replace(/^\/home\/?(?=$|[?#])/, '/');
}

/** Editor HTML from WordPress, ready for the site: every link goes through siteLink(). */
export function editorHtml(html: string | null | undefined, cmsUrl?: string) {
  if (!html) return '';
  if (!cmsUrl) return html;
  return html.replace(/href=(["'])(.*?)\1/g, (_, quote, url) => `href=${quote}${siteLink(url, cmsUrl)}${quote}`);
}
