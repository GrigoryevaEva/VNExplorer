// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';

import CoverImage from '@/ui/CoverImage.vue';

it('replaces a failed cover with an accessible fallback and retries a changed source', async () => {
    const cover = mount(CoverImage, {
        props: { src: 'https://images.example/first.jpg', title: 'A story' },
    });

    await cover.get('img').trigger('error');
    expect(cover.find('img').exists()).toBe(false);
    expect(cover.get('[role="img"]').attributes('aria-label')).toBe('A story: cover unavailable');

    await cover.setProps({ src: 'https://images.example/second.jpg' });
    expect(cover.get('img').attributes('src')).toBe('https://images.example/second.jpg');
    expect(cover.find('[role="img"]').exists()).toBe(false);
    await cover.get('img').trigger('load');
    expect(cover.find('[aria-label="Loading cover"]').exists()).toBe(false);
    cover.unmount();
});
