# App Review notes · submission worksheet

Copy the reviewed text below into App Store Connect. Review credentials must be supplied privately in App Store Connect, never in this repository.

## Product and access

Biz Bize is a Turkish, two-person shared memories app. There is no public feed or random matching. Two verified accounts join a private space using a single-use invitation code. Maps, shared photos, messaging and small tasks form the primary experience.

A no-account local preview is available from the welcome screen: **Örnek dünyayı keşfet**. All sample users and locations are labelled as examples. Preview does not publish live GPS data and cannot demonstrate the real backend.

Provide two working verified review accounts in the private review fields. Before submission, confirm both accounts can sign in, belong to the same test pair and contain non-personal review content. A separate test account may be used to test account deletion without destroying the primary review pair.

## Review steps

1. Sign in using the supplied first review account; open Harita, Mesajlar and Albüm.
2. Use the second review account on another device to verify shared messages, tasks and memories.
3. Create a memory with a selected photo, note, date and place. Photo safety checks run on the cloud before publication.
4. Open Ayarlar → Konum paylaşımı. Location is optional and off by default for a new pair. Denying location does not disable chat or album.
5. **Uygulama açıkken paylaş** enables foreground sharing. **Arka planda da paylaş** separately requests background permission to share the last location with the paired user while the screen is locked. The app uses the location background mode for this user-selected feature. No continuous-update guarantee is made.
6. **Konum paylaşımını durdur** revokes sharing. A reading older than two minutes is shown as stale.
7. Ayarlar contains privacy policy, terms, reporting, blocking, disconnect and account deletion. Partner messages and memories also expose a report action.
8. Use a disposable account to test **Hesabımı sil**. No website or support call is required to initiate deletion. Deletion also removes the shared pair content for both members.

## Required private fields before submission

- Review account A and password.
- Review account B and password.
- Disposable deletion test account and password if provided.
- Reviewer contact name, phone and email.
- Tested build number and any permission-specific notes.

Keep the Firebase backend and Cloud Vision safety service available during review. Do not submit these notes until real-device acceptance, report review operations and account deletion have been tested.
