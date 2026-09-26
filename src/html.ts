/**
 * A link from WordPress, ready for the site. Links to the site's own pages become short site
 * paths (/about/), whether WordPress wrote them with the CMS's address
 * (https://cms.example.com/about/, what its link box and page picker give by default) or the
 * site's own (https://example.com/about/, what a CMS with the frontend-addresses plugin gives).
 * The page with the slug "home" is the site's home page, so /home/ becomes /. Links to uploaded
 * files on the CMS (/wp-content/...) and to other websites are left alone.
 *   cmsUrl  the site's WordPress address (its GraphQL URL is fine)
 *   siteUrl the site's own address (Astro.site, from `site` in astro.config.mjs)
 */
export function siteLink(url: string | null | undefined, cmsUrl?: string, siteUrl?: string | URL) {
  if (!url) return '';
  const own = (base: string | URL | undefined, keepUploads: boolean) => {
    if (!base) return null;
    const origin = new URL(base).origin;
    if (!url.startsWith(origin)) return null;
    const rest = url.slice(origin.length);
    if (rest === '') return '/';
    if (!/^[/?#]/.test(rest) || (keepUploads && rest.startsWith('/wp-content/'))) return null;
    return (rest.startsWith('/') ? rest : `/${rest}`).replace(/^\/home\/?(?=$|[?#])/, '/');
  };
  return own(cmsUrl, true) ?? own(siteUrl, false) ?? url;
}

/** Editor HTML from WordPress, ready for the site: every link goes through siteLink(). */
export function editorHtml(html: string | null | undefined, cmsUrl?: string, siteUrl?: string | URL) {
  if (!html) return '';
  if (!cmsUrl && !siteUrl) return html;
  return html.replace(/href=(["'])(.*?)\1/g, (_, quote, url) => `href=${quote}${siteLink(url, cmsUrl, siteUrl)}${quote}`);
}

/**
 * Where a WordPress link field goes, for anything rendered as a link: the site address, whether
 * it opens in a new tab, whether it's another website (a full address that isn't the CMS, whose
 * uploaded files count as the site's own), and the <a> attributes to spread on the link
 * (href, and target/rel for a new tab; pair them with NewTabNote.astro). Used by Button.astro,
 * Card Grid's cards and Navigation.astro.
 */
export function linkTarget(
  link: { url: string | null; target: string | null } | null | undefined,
  cmsUrl?: string,
  siteUrl?: string | URL,
) {
  const href = siteLink(link?.url, cmsUrl, siteUrl);
  const newTab = link?.target === '_blank';
  const external = /^https?:\/\//.test(href) && (!cmsUrl || new URL(href).origin !== new URL(cmsUrl).origin);
  const attrs = { href, target: newTab ? ('_blank' as const) : undefined, rel: newTab ? 'noopener' : undefined };
  return { href, newTab, external, attrs };
}
