# Plush Squad on itch.io

The game stays live on GitHub Pages. itch.io is a second home for the same build: a free page with "pay what you want".

## 1. Build the zip

```
sh tools/itch-build.sh
```

Gives `dist/plush-squad-itch-<version>.zip` (about 12 MB, 114 files, `index.html` at the root). Only `index.html`, `manifest.json`, `js/`, `assets/` and `vendor/` go in. Checked: the zip runs inside a cross-origin iframe (like itch's), saves to localStorage, no page errors. The service worker is off on itch hosts (`itch.zone`, `itch.io`, `hwcdn.net`), so every new upload is seen at once.

## 2. Create the project (Kondrat, once)

itch.io account (an adult's), then Dashboard, Create new project:

| Field | Value |
|---|---|
| Title | Plush Squad |
| Project URL | `plush-squad` |
| Short description | Pillow fights with your own plush toys! |
| Classification | Games |
| Kind of project | HTML |
| Release status | Released (or In development) |
| Pricing | No payments, or Donate / "Pay what you want" with minimum 0 (see 5) |
| Uploads | the zip from step 1, tick "This file will be played in the browser" |
| Viewport | 1280 x 720, tick "Mobile friendly" (orientation: default), tick "Fullscreen button", tick "Automatically start on page load" off |
| Genre | Fighting (or Casual) |
| Tags | pillow-fight, plush, kids, family-friendly, turn-based, cute, dragon, casual, mobile, pwa |
| Community | Comments: off (a kids' game) |
| Visibility | Draft first, check it, then Public |
| Cover image | `docs/itch/cover.png` (630 x 500) |
| Screenshots | `docs/itch/1_title.jpg` ... `6_capsules.jpg` |
| Trailer | YouTube link, once the channel exists |

## 3. Page text (paste into Description)

> **Plush Squad** is a cozy pillow-fight game starring Jack the plush dragon.
>
> - Pillow-fight your way through 7 worlds: Pillow Hills, Space, Canada, Ocean, Veggie Patch, Countryballs and Spooky.
> - Beat silly bosses: a sleepy sea monster, a broccoli who thinks he is a tree, a cardboard rocket that wants to reach space.
> - **Turn your own toy into a hero:** snap a photo, the game cuts it out on your device and gives it moves.
> - Collect stickers, hats and capsules, send gifts to friends, take your toys on adventures.
>
> Made by a dad and his 10-year-old chief tester. Free to play. Works on phones, tablets and computers.
>
> *Privacy:* no ads, no tracking. Toy photos are processed on your device. An account is optional (a username, no e-mail); see the privacy note below.

## 4. Privacy note (paste under the description)

See `docs/itch/privacy.md`.

## 5. Donations

Kondrat's choice: "No payments" (simplest), or "Pay what you want" with minimum 0 and a suggested 2 USD. Payouts need PayPal or Stripe in itch's Payout settings; itch's share can be set to 0%. Never put a donate button inside the game (a kids' game).

## 6. Updating

After each release on GitHub: `sh tools/itch-build.sh`, then on the itch page Edit game, Uploads, replace the zip (or `butler push dist/plush-squad-itch-<v>.zip <user>/plush-squad:html5` with itch's `butler` tool and Kondrat's own API key; never commit the key).

## Notes

- Saves on itch and on GitHub Pages are separate (different sites). Log in to the same account in both to share progress through the cloud save.
- The toy-photo models download from the Hugging Face CDN on first use, as on GitHub Pages.
- iPhone safe areas: inside itch's frame the game gets a plain rectangle, so the notch code does nothing there; fullscreen works through itch's button.
