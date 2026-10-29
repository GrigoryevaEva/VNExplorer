// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import axios from 'axios';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';

const server = setupServer();
const originalAdapter = axios.defaults.adapter;
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => {
    server.close();
    axios.defaults.adapter = originalAdapter;
});

it('queues simultaneous language expansions and reuses a multilingual release across missing-row retry', async () => {
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
        finish = resolve;
    });
    const batches: string[][] = [];
    let first = true;
    let failRussian = true;
    server.use(
        http.post('https://api.vndb.org/kana/release', async ({ request }) => {
            const query = (await request.json()) as { fields: string; filters: unknown[] };
            if (!query.fields.includes('title')) {
                return HttpResponse.json({
                    results: [
                        { id: 'r731', languages: [{ lang: 'en' }, { lang: 'ru' }] },
                        { id: 'r732', languages: [{ lang: 'ru' }] },
                    ],
                    more: false,
                });
            }
            const ids =
                query.filters[0] === 'id'
                    ? [String(query.filters[2])]
                    : (query.filters.slice(1) as string[][]).map((filter) => filter[2]!);
            batches.push(ids);
            if (first) {
                first = false;
                await gate;
            }
            if (ids.includes('r732') && failRussian) {
                failRussian = false;
                return new HttpResponse(null, { status: 503 });
            }
            return HttpResponse.json({
                results: ids.map((id) => ({
                    id,
                    title: `Edition ${id}`,
                    official: false,
                    platforms: [],
                    extlinks: [],
                })),
                more: false,
            });
        })
    );
    // MSW's Node server intercepts HTTP, while jsdom supplies only the rendering lifecycle.
    axios.defaults.adapter = 'http';
    const { ReleaseGroups } = await import('@/components/releases');
    const wrapper = mount(ReleaseGroups, { props: { novelId: 'v731' } });
    try {
        await vi.waitFor(() => expect(wrapper.text()).toContain('English'));
        expect(wrapper.findAll('[role=region]')).toHaveLength(0);
        await wrapper.findAll('.group-toggle')[0]!.trigger('click');
        await vi.waitFor(() => expect(batches).toEqual([['r731']]));
        await wrapper.findAll('.group-toggle')[1]!.trigger('click');
        expect(batches).toEqual([['r731']]);
        finish();
        await vi.waitFor(() =>
            expect(wrapper.get('[aria-label="Russian releases"]').text()).toContain(
                'Loaded 1 / 2'
            ));
        expect(wrapper.get('[aria-label="Russian releases"]').text()).toContain('Edition r731');
        expect(batches).toEqual([['r731'], ['r732']]);
        await wrapper.get('[aria-label="Russian releases"] [role=alert] button').trigger('click');
        await vi.waitFor(() =>
            expect(wrapper.get('[aria-label="Russian releases"]').text()).toContain(
                'Edition r732'
            ));
        expect(batches).toEqual([['r731'], ['r732'], ['r732']]);
    } finally {
        finish();
        wrapper.unmount();
    }
});
