/**
 * Lets `node --test` load the app's lib files, which use bundler-style extensionless imports
 * (`./i18n`) and the `@/` alias, without changing the source.
 */
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');

registerHooks({
    resolve(specifier, context, nextResolve) {
        let spec = specifier;
        if (spec.startsWith('@/')) {
            spec = pathToFileURL(path.join(SRC, spec.slice(2))).href;
        }
        const isRelative = spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('file:');
        if (isRelative && !/\.(m?js|jsx|json)$/.test(spec) && context.parentURL) {
            const base = new URL(spec, context.parentURL);
            for (const ext of ['.js', '.jsx', '/index.js']) {
                const candidate = new URL(base.href + ext);
                if (existsSync(fileURLToPath(candidate))) {
                    return nextResolve(candidate.href, context);
                }
            }
        }
        return nextResolve(spec, context);
    },
});
