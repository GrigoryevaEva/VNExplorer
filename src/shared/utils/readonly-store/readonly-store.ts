import type { StoreGeneric } from 'pinia';
import type { DeepReadonly } from 'vue';
import { readonly } from 'vue';

type TReadonlyStore<TStore extends StoreGeneric> = Omit<TStore, keyof TStore['$state'] | '$state'> &
    DeepReadonly<TStore['$state']> & {
        readonly $state: DeepReadonly<TStore['$state']>;
        readonly $patch: never;
        readonly $reset: never;
        readonly $subscribe: never;
    };

const facades = new WeakMap<StoreGeneric, object>();

// Preserve Pinia's registered state and storeToRefs getter inference. The
// original $onAction signature is used only for inference, never at runtime.
export const readonlyStore = <TStore extends StoreGeneric>(
    store: TStore
): TReadonlyStore<TStore> => {
    let facade = facades.get(store);
    if (!facade) {
        facade = new Proxy(readonly(store), {
            get(target, key, receiver) {
                if (
                    key === '$patch' ||
                    key === '$reset' ||
                    key === '$subscribe' ||
                    key === '$onAction'
                ) {
                    return undefined;
                }
                return Reflect.get(target, key, receiver);
            },
        });
        facades.set(store, facade);
    }
    return facade as TReadonlyStore<TStore>;
};
