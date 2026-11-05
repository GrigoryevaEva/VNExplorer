<script setup lang="ts">
    import type { TCatalogLanguage } from '@/entities/catalog';
    import { CATALOG_LANGUAGES } from '@/entities/catalog';
    defineProps<{ modelValue: TCatalogLanguage }>();
    defineEmits<{ 'update:modelValue': [value: TCatalogLanguage] }>();
    const LANGUAGE_CHOICES = [
        { value: CATALOG_LANGUAGES.ALL, label: 'All' },
        { value: CATALOG_LANGUAGES.RUSSIAN, label: 'Russian' },
        { value: CATALOG_LANGUAGES.ENGLISH, label: 'English' },
    ] as const;
</script>

<template>
    <fieldset class="language-filter">
        <legend>Language availability</legend>
        <label
            v-for="choice in LANGUAGE_CHOICES"
            :key="choice.value"
        >
            <input
                type="radio"
                name="catalog-language"
                :value="choice.value"
                :checked="modelValue === choice.value"
                @change="$emit('update:modelValue', choice.value)"
            />
            {{ choice.label }}
        </label>
        <p>Published releases, including demos and partial translations.</p>
    </fieldset>
</template>

<style scoped>
    .language-filter {
        margin: 22px 0;
        padding: 0;
        border: 0;
    }

    legend {
        margin-bottom: var(--space-sm);
        font-weight: 700;
    }

    label {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 9px 0;
        cursor: pointer;
    }

    input {
        width: 18px;
        height: 18px;
        accent-color: var(--lime);
    }

    p {
        font-size: var(--font-size-sm);
        line-height: 1.5;
        color: var(--mint-ink);
    }
</style>
