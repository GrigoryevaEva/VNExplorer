import type { Ref } from 'vue';
import { onBeforeUnmount, ref } from 'vue';

import { useEventListener } from '@vueuse/core';

import { DIALOG_FOCUSABLE_SELECTOR } from './constants';

export const useModalDialog = (dialog: Ref<HTMLDialogElement | undefined>) => {
    const isOpen = ref(false);
    let trigger: HTMLElement | null = null;
    let scroll = 0;
    let previousOverflow = '';

    const restore = (): void => {
        if (!isOpen.value) {
            return;
        }
        isOpen.value = false;
        document.documentElement.style.overflow = previousOverflow;
        if (trigger?.isConnected) {
            trigger.focus({ preventScroll: true });
        }
        window.scrollTo({ top: scroll, behavior: 'instant' });
        trigger = null;
    };

    const open = (): void => {
        if (isOpen.value || !dialog.value) {
            return;
        }
        trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        scroll = window.scrollY;
        previousOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        isOpen.value = true;
        dialog.value.showModal();
    };

    const close = (): void => {
        if (!isOpen.value) {
            return;
        }
        dialog.value?.close();
        restore();
    };

    useEventListener(dialog, 'close', () => {
        // A queued close event can arrive after the same dialog has reopened.
        if (!dialog.value?.open) {
            restore();
        }
    });
    useEventListener(dialog, 'keydown', (event: KeyboardEvent) => {
        if (!isOpen.value || event.key !== 'Tab') {
            return;
        }
        const controls = dialog.value?.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR);
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
        }
    });
    onBeforeUnmount(close);

    return { isOpen, open, close };
};
