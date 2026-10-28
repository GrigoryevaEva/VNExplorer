<script setup lang="ts">
    import type { CatalogLanguage } from '../modules/catalog/selection';
    defineProps<{ modelValue: CatalogLanguage }>();
    defineEmits<{ 'update:modelValue': [value: CatalogLanguage] }>();
    const choices = [
        { value: 'all', label: 'All' },
        { value: 'ru', label: 'Russian' },
        { value: 'en', label: 'English' },
    ] as const;
</script>

<template>
    <fieldset class="language-filter">
        <legend>Language availability</legend>
        <label
            v-for="choice in choices"
            :key="choice.value"
            ><input
                type="radio"
                name="catalog-language"
                :value="choice.value"
                :checked="modelValue === choice.value"
                @change="$emit('update:modelValue', choice.value)"
            />{{ choice.label }}</label
        >
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
        margin-bottom: 12px;
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
        font-size: 12px;
        line-height: 1.5;
        color: #425345;
    }
</style>
