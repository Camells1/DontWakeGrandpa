# Where the sounds come from

## assets/sfx
Footsteps, knocks, impacts, clicks and jingles are from Kenney's audio packs (https://kenney.nl), licence CC0.
Everything else you hear (the snore, squeaks, boings, the lullaby, the music) is made in code in `src/audio.js`.

## assets/voice
Grandpa's lines are spoken by Piper (https://github.com/rhasspy/piper, MIT licence) using the `en_US-norman-medium`
voice from https://huggingface.co/rhasspy/piper-voices, which was trained on public-domain LibriVox recordings.
`tools/make-voice.js` records each line and then ages it (lower, slower, with an old man's wobble).

## Models
Every model in the game is built in code from simple shapes. Nothing is downloaded.
