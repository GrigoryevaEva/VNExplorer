import postcssGlobalData from '@csstools/postcss-global-data';
import { fileURLToPath } from 'node:url';
import postcssCustomMedia from 'postcss-custom-media';

export default {
    plugins: [
        postcssGlobalData({
            files: [
                fileURLToPath(new URL('./src/shared/ui/styles/breakpoints.css', import.meta.url)),
            ],
        }),
        postcssCustomMedia(),
    ],
};
