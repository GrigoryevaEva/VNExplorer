// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';

import { ScreenshotGallery } from '@/components/screenshots';
import type { INovelScreenshot } from '@/entities/visual-novel';

const screenshot = (thumbnail: string): INovelScreenshot => ({
    id: 'sf1',
    url: '/full.jpg',
    thumbnail,
    dims: [1600, 900],
    thumbnailDimensions: [256, 144],
});

it('shows unavailable feedback immediately when a screenshot thumbnail URL is absent', () => {
    const gallery = mount(ScreenshotGallery, { props: { screenshots: [screenshot('')] } });
    const thumbnail = gallery.get('button[aria-label="Open screenshot 1"]');
    expect(thumbnail.get('[role="status"]').text()).toBe('Screenshot unavailable');
    expect(thumbnail.find('img').exists()).toBe(false);
    gallery.unmount();
});

it('recovers from a failed thumbnail when its source changes and clears loading after load', async () => {
    const gallery = mount(ScreenshotGallery, {
        props: { screenshots: [screenshot('/broken.jpg')] },
    });
    const thumbnail = gallery.get('button[aria-label="Open screenshot 1"]');
    expect(thumbnail.get('[role="status"]').text()).toBe('Loading screenshot…');
    await thumbnail.get('img').trigger('error');
    expect(thumbnail.get('[role="status"]').text()).toBe('Screenshot unavailable');
    await gallery.setProps({ screenshots: [screenshot('/working.jpg')] });
    expect(thumbnail.get('img').attributes('src')).toBe('/working.jpg');
    expect(thumbnail.get('[role="status"]').text()).toBe('Loading screenshot…');
    await thumbnail.get('img').trigger('load');
    expect(thumbnail.find('[role="status"]').exists()).toBe(false);
    gallery.unmount();
});

it('ignores queued image events from a previous thumbnail while its replacement loads', async () => {
    const gallery = mount(ScreenshotGallery, {
        props: { screenshots: [screenshot('/first.jpg')] },
    });
    const thumbnail = gallery.get('button[aria-label="Open screenshot 1"]');
    const previousImage = thumbnail.get('img').element;
    await gallery.setProps({ screenshots: [screenshot('/second.jpg')] });
    previousImage.dispatchEvent(new Event('error'));
    await gallery.vm.$nextTick();
    expect(thumbnail.get('img').attributes('src')).toBe('/second.jpg');
    expect(thumbnail.get('[role="status"]').text()).toBe('Loading screenshot…');
    previousImage.dispatchEvent(new Event('load'));
    await gallery.vm.$nextTick();
    expect(thumbnail.get('[role="status"]').text()).toBe('Loading screenshot…');
    await thumbnail.get('img').trigger('load');
    expect(thumbnail.find('[role="status"]').exists()).toBe(false);
    gallery.unmount();
});
