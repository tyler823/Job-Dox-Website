# Job-Dox Security — How It Works

## What was broken
Before, the app talked directly to Firestore with no real authentication — any user could potentially read or write any company's data. There were no permission checks at the database level, so a modified client could access everything.

## How login works now (three-step handshake)
- User logs in through Memberstack, which gives us their member ID.
- Our server-side function (`ms-firebase-auth`) verifies that member ID against the Memberstack Admin API, then issues a Firebase custom token stamped with `companyId`, `permissionLevel`, and `email`.
- The client signs into Firebase with that token — every subsequent Firestore request carries those claims automatically.

## How company data stays separate
Every company's data lives under `/companies/{companyId}`. Firestore rules check that the `companyId` in your token matches the `companyId` in the path. If they don't match, the read/write is denied. Cross-company access is structurally impossible.

## How permissions are enforced
Your permission level (0–10) is baked into your Firebase token by the server. Firestore rules use `hasPermission(level)` to gate every collection — e.g., staff records require level 3+ to read and 9+ to write. The client cannot change its own permission level; only the server can.

## What developers must do for new collections
Add an explicit rule under `/companies/{companyId}` using the `canAccess(companyId, level)` helper. If you skip this, access is denied by default — Firestore rules are deny-all unless a match exists. Always require `isOwnCompany` at minimum.
