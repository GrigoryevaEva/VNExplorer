import prettier from 'prettier';
import { describe, expect, it } from 'vitest';

describe('agreed destructuring format', () => {
    it.each([
        ['variable.ts', 'const { first, second, third } = source;'],
        ['arrow.ts', 'const read = ({ first, second, third }) => first + second + third;'],
        [
            'function.ts',
            'function read({ first, second, third }) { return first + second + third; }',
        ],
        ['typed.ts', 'const { first, second: renamed, ...third }: IValue = source;'],
        [
            'component.vue',
            '<script setup lang="ts">const { first, second, third } = source;</script><template>{{ first }}</template>',
        ],
    ])('wraps three properties and stays stable in %s', async (filepath, source) => {
        const options = { ...(await prettier.resolveConfig('package.json')), filepath };
        const formatted = await prettier.format(source, options);

        expect(formatted).toMatch(
            /\{\n\s+first,\n\s+second(?:: renamed)?,\n\s+(?:\.\.\.)?third,?\n\s*\}/
        );
        expect(await prettier.format(formatted, options)).toBe(formatted);
    });

    it('keeps two properties compact and leaves object literals to standard Prettier', async () => {
        const options = { ...(await prettier.resolveConfig('package.json')), filepath: 'short.ts' };

        expect(await prettier.format('const { first, second } = source;', options)).toBe(
            'const { first, second } = source;\n'
        );
        expect(
            await prettier.format('const value = { first: 1, second: 2, third: 3 };', options)
        ).toBe('const value = { first: 1, second: 2, third: 3 };\n');
    });

    it('preserves adjacent template text instead of inserting spaces into tag rows', async () => {
        const options = { ...(await prettier.resolveConfig('package.json')), filepath: 'Tags.vue' };
        const source =
            '<template><div><strong>Fantasy</strong><button class="tag-info" aria-label="About Fantasy">Info</button><button class="tag-include">+ Include</button></div></template>';
        const formatted = await prettier.format(source, options);

        expect(formatted).toMatch(/>Info<\/button\s*>\s*<button/);
        expect(formatted).toMatch(/>\+ Include<\/button/);
        expect(await prettier.format(formatted, options)).toBe(formatted);
    });
});
