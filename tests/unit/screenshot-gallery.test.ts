// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { ScreenshotGallery } from '@/components/screenshots';

beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
        configurable: true,
        value: function (this: HTMLDialogElement) {
            this.open = true;
        },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
        configurable: true,
        value: function (this: HTMLDialogElement) {
            this.open = false;
            this.dispatchEvent(new Event('close'));
        },
    });
});
afterEach(() => {
    document.documentElement.style.overflow = '';
});

it('releases the page on unmount and ignores late native close events after disposal', async () => {
    document.documentElement.style.overflow = 'scroll';
    const gallery = mount(ScreenshotGallery, {
        attachTo: document.body,
        props: {
            screenshots: [
                {
                    id: 'sf1',
                    url: '/full.jpg',
                    thumbnail: '/thumb.jpg',
                    dims: [1600, 900],
                    thumbnailDimensions: [256, 144],
                },
            ],
        },
    });
    const dialog = gallery.get('dialog').element;
    await gallery.get('button').trigger('click');
    expect(document.documentElement.style.overflow).toBe('hidden');
    gallery.unmount();
    expect(document.documentElement.style.overflow).toBe('scroll');
    document.documentElement.style.overflow = 'auto';
    dialog.dispatchEvent(new Event('close'));
    expect(document.documentElement.style.overflow).toBe('auto');
    expect(dialog.open).toBe(false);
});

it('closes the active viewer when its screenshot disappears', async () => {
    const gallery = mount(ScreenshotGallery, {
        attachTo: document.body,
        props: {
            screenshots: [
                {
                    id: 'sf1',
                    url: '/full.jpg',
                    thumbnail: '/thumb.jpg',
                    dims: [1600, 900],
                    thumbnailDimensions: [256, 144],
                },
            ],
        },
    });
    await gallery.get('button').trigger('click');
    await gallery.setProps({ screenshots: [] });
    expect(gallery.get('dialog').element.open).toBe(false);
    expect(gallery.text()).toContain('No screenshots available.');
    expect(document.documentElement.style.overflow).toBe('');
    gallery.unmount();
});
