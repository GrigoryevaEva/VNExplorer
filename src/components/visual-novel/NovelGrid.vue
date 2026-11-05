<template>
    <div class="novel-grid"><slot /></div>
</template>

<style scoped>
    .novel-grid {
        --masonry-gap: 22px;

        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        grid-auto-rows: 1px;
        align-content: start;
        column-gap: 18px;
    }

    @media (width >= 1700px) {
        .novel-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
        }
    }

    @media (--viewport-compact) {
        .novel-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (--viewport-mobile) {
        .novel-grid {
            --masonry-gap: var(--space-md);

            column-gap: var(--space-sm);
        }
    }

    @media (width <= 350px) {
        .novel-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
