<script setup lang="ts">
import type { CatalogLanguage } from '../modules/catalog/selection'
defineProps<{ modelValue: CatalogLanguage }>()
defineEmits<{ 'update:modelValue': [value: CatalogLanguage] }>()
const choices = [{ value: 'all', label: 'All' }, { value: 'ru', label: 'Russian' }, { value: 'en', label: 'English' }] as const
</script>

<template>
  <fieldset class="language-filter">
    <legend>Language availability</legend>
    <label v-for="choice in choices" :key="choice.value"><input type="radio" name="catalog-language" :value="choice.value" :checked="modelValue === choice.value" @change="$emit('update:modelValue', choice.value)" />{{ choice.label }}</label>
    <p>Published releases, including demos and partial translations.</p>
  </fieldset>
</template>

<style scoped>
.language-filter { border: 0; padding: 0; margin: 22px 0; }
legend { font-weight: 700; margin-bottom: 12px; }
label { display: flex; align-items: center; gap: 9px; padding: 9px 0; cursor: pointer; }
input { accent-color: var(--lime); width: 18px; height: 18px; }
p { color: #425345; font-size: 12px; line-height: 1.5; }
</style>
