/**
 * Private personal-finance app: keep every page out of search engines.
 */
export default function robots() {
    return {
        rules: { userAgent: '*', disallow: '/' },
    };
}
