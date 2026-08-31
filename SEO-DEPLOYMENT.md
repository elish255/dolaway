# DolaWay SEO deployment notes

## Primary domain
Use `https://www.dollaway.site/` as the only canonical/primary domain.

If `https://dolaway.site/` is also controlled by you, configure a **301 permanent redirect** from:
- `https://dolaway.site/*` -> `https://www.dollaway.site/*`
- `https://www.dolaway.site/*` -> `https://www.dollaway.site/*`

Preserve the path and query string where possible. Do not run two competing copies of the site.

## Google
After deployment:
1. Verify `www.dollaway.site` in Google Search Console.
2. Submit `https://www.dollaway.site/sitemap.xml`.
3. Request indexing for `https://www.dollaway.site/`.
4. If the old domain was verified, inspect its URL and confirm the 301 redirect.

The source has been updated with canonical URLs, robots directives, stronger brand/description metadata, Open Graph URL/site-name metadata, and an SEO-friendly sitemap.
