# Screenshot gallery migration

`components/screenshots` accepts the validated `INovelScreenshot` entity collection. Its public
entry exports the gallery; thumbnails, image feedback and the viewer stay internal. Components
perform no HTTP requests. The browser loads the supplied thumbnail and full-image URLs normally.

The gallery composes thumbnails and the subject-specific viewer. The viewer owns the selected
screenshot, cyclic previous/next navigation and arrow keys. With one image both navigation
buttons remain disabled. Full images retain `object-fit: contain`, without filtering or cropping.
Loading, failed and missing URLs have feedback; changing the source retries an image. Queued load/error events from a detached previous
image cannot change the replacement image state. If the
selected screenshot disappears, the viewer closes and releases the page.

`shared/ui/modal-dialog` owns native dialog effects: opening/closing, Tab focus containment,
per-opening overflow/scroll capture, restoring the connected trigger with `preventScroll`, and
cleanup on unmount. Escape remains native dialog behavior. VueUse `useEventListener` binds and
disposes the close/keyboard subscriptions. A late queued close cannot unlock a reopened dialog.
Restoration is idempotent, and closed dialogs do not acquire or release another owner's effects.

Scroll locking remains explicit because the installed VueUse `useScrollLock` captures overflow
when its element is first watched, whereas this contract captures the current inline overflow on
each opening (including an already hidden root). Its extra iOS touch prevention would also change
the existing touch behavior. The lock therefore continues to target `document.documentElement`.

Public gallery component tests cover missing/broken/replaced thumbnail sources, active-image
removal, unmount and late native close disposal. Browser tests cover full-image rendering, failed
images, loading, cyclic mouse/keyboard navigation, repeated openings with different previous
overflow values, native Escape, Tab/Shift+Tab, exact page scroll/focus restoration and phone/touch
controls. The phone screenshot remains visually checked at 320 by 568 pixels. The old `src/ui`
screenshot files and their exact quality exceptions have been removed.
