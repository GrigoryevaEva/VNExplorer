import type { Plugin, Printer } from 'prettier';
import { doc } from 'prettier';
import * as babel from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';
import * as typescript from 'prettier/plugins/typescript';

interface IObjectPattern {
    type: string;
    properties?: unknown[];
}

// Keep the standard printer for every construct. Only group its existing
// object-pattern document at the agreed three-property threshold.
const printer: Printer<IObjectPattern> = {
    ...estree.printers.estree,
    print(path, options, print) {
        const result = estree.printers.estree.print(path, options, print);
        if (path.node.type !== 'ObjectPattern' || (path.node.properties?.length ?? 0) < 3) {
            return result;
        }
        return doc.builders.group(result, { shouldBreak: true });
    },
};

const parsers = Object.fromEntries(
    Object.entries({ ...babel.parsers, ...typescript.parsers })
        .filter(([, parser]) => parser.astFormat === 'estree')
        .map(([name, parser]) => [name, { ...parser, astFormat: 'multiline-estree' }])
);

export default {
    parsers,
    printers: { 'multiline-estree': printer },
} satisfies Plugin<IObjectPattern>;
