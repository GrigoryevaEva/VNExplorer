<script setup lang="ts">
    import { SavedNotice } from '@/components/saved';
</script>

<template>
    <div class="app-shell">
        <header class="app-header">
            <RouterLink
                to="/"
                class="brand"
                aria-label="VNDB Explorer home"
            >
                <span
                    class="brand-mark"
                    aria-hidden="true"
                >
                    <span>vn</span>
                    <span class="brand-arrow">↗</span>
                </span>
                <span class="brand-name">
                    visual novel
                    <br />
                    <strong>EXPLORER</strong>
                </span>
            </RouterLink>

            <nav aria-label="Main navigation">
                <RouterLink
                    to="/"
                    class="nav-link"
                >
                    Catalog
                    <span aria-hidden="true">↗</span>
                </RouterLink>
                <RouterLink
                    to="/saved"
                    class="nav-link"
                >
                    Saved
                </RouterLink>
            </nav>

            <span class="header-note">A LITTLE ESCAPE, A GOOD STORY.</span>
        </header>

        <main class="app-main">
            <RouterView />
        </main>

        <SavedNotice />
    </div>
</template>

<style scoped>
    .app-shell {
        display: grid;
        grid-template-rows: 83px minmax(0, 1fr);
        max-width: 2000px;
        height: 100dvh;
        margin: auto;
    }

    .app-header {
        display: flex;
        align-items: center;
        gap: 48px;
        padding: 0 38px;
        border-bottom: 1px solid var(--line);
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
    }

    .brand-mark {
        padding: 0 11px 4px 6px;
        font-size: 38px;
        font-weight: 900;
        line-height: 1.1;
        letter-spacing: -5px;
        color: var(--bg);
        background: var(--lime);
        border-radius: 12px 12px 3px;
    }

    .brand-arrow {
        display: inline-block;
        font-size: 17px;
        letter-spacing: 0;
        transform: translate(5px, -14px);
    }

    .brand-name {
        font-size: var(--font-size-xs);
        line-height: 1.35;
        letter-spacing: 0.7px;
    }

    .brand-name strong {
        font-size: var(--font-size-body);
        letter-spacing: 1.4px;
    }

    .nav-link {
        padding: 31px 0;
        font-size: var(--font-size-body);
        font-weight: 700;
        text-decoration: none;
        border-bottom: 2px solid transparent;
    }

    .nav-link span {
        margin-left: 19px;
        color: var(--lime);
    }

    .header-note {
        margin-left: auto;
        font-size: var(--font-size-micro);
        letter-spacing: 1.5px;
        color: var(--muted);
    }

    .app-main {
        min-height: 0;
    }

    .app-header nav {
        display: flex;
        align-items: center;
        gap: var(--space-xl);
    }

    @media (--viewport-compact) {
        .app-header {
            padding: 0 24px;
        }
    }

    @media (--viewport-mobile) {
        .app-shell {
            grid-template-rows: 67px minmax(0, 1fr);
        }

        .app-header {
            gap: 15px;
            padding: 0 18px;
        }

        .brand-mark {
            font-size: 31px;
        }

        .brand-name {
            font-size: var(--font-size-micro);
        }

        .brand-name strong {
            font-size: var(--font-size-xs);
        }

        .header-note {
            display: none;
        }

        .app-header nav {
            gap: 15px;
            margin-left: auto;
        }

        .nav-link {
            padding: 23px 0;
            font-size: var(--font-size-sm);
        }

        .nav-link span {
            margin-left: 3px;
        }
    }

    .nav-link.router-link-exact-active {
        border-bottom-color: var(--lime);
    }
</style>
