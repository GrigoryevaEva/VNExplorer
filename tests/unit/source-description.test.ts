// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { SourceDescription } from '@/shared/ui/source-description';

describe('source description rendering', () => {
    it('keeps paired formatting across paragraphs and renders executable markup as text', () => {
        const description = mount(SourceDescription, {
            props: {
                baseUrl: 'https://vndb.org',
                text: '[b]First paragraph.\n\nSecond [i]paragraph[/i].[/b] <img src=x onerror=alert(1)> [url=javascript:alert(1)]unsafe[/url]',
            },
        });

        expect(description.get('strong').text()).toBe('First paragraph.Second paragraph.');
        expect(description.get('strong em').text()).toBe('paragraph');
        expect(description.findAll('strong .source-paragraph-break')).toHaveLength(1);
        expect(description.text()).toContain('<img src=x onerror=alert(1)>');
        expect(description.findAll('img, a')).toHaveLength(0);
        description.unmount();
    });
});
