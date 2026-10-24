# Plush Squad privacy note

Plain words, for parents.

- **No ads, no tracking, no analytics.** The game sells nothing and asks for no payment inside the game.
- **Playing without an account:** everything stays on this device (browser storage). Nothing is sent anywhere.
- **Toy photos:** cutting out the toy and guessing its type happens on the device. The AI models are downloaded once from the Hugging Face CDN; the photo is not sent to them.
- **Optional account (for cloud save and friends):** a username and a password chosen by the player. No e-mail, no real name, no age, no location. A recovery code replaces e-mail reset. Stored in a Supabase cloud database:
  - the game progress (levels, stars, stickers, hats),
  - pictures of the toys the player added (so they show on other devices and to friends),
  - friends list and gifts between friends (there is no free text chat),
  - scores for the weekly boss and the Star Catch board (shown with the username).
- **Deleting:** removing a toy in the game deletes its picture from the cloud. To delete a whole account, a parent can write to the owner through the itch.io page.
- **Kids:** made for children together with a parent. The Parents corner is behind a multiplication-table question.
