import { z } from 'zod';

export const responseEnvelopeSchema = z.looseObject({
    results: z.array(z.unknown()),
    more: z.boolean(),
    count: z.number().int().nonnegative().safe().optional(),
});

export type TResponseEnvelopeDto = z.infer<typeof responseEnvelopeSchema>;
