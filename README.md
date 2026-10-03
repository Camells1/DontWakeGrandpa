# Don't Wake Grandpa

A goofy co-op heist for 2 to 4 players. You are tiny beans; he is a sleeping giant with a lot of nice things.
Sneak out of the mouse hole, carry his stuff home over your heads, and keep the noise down: Grandpa hears your
footsteps, everything you drop, and your real microphone. Wake him and he comes after you with a bunny slipper.

- First person, proximity voice chat (push to talk, voice activation or always on)
- Five nights with rising quotas, a Roomba, a cuckoo clock and a shop between nights
- Dress your whole bean: body, face, real 3D clothes, hats and backpacks; eight dances and eight emotes
- Ragdolls, frying pans, and troll items: shrink ray, helium, glue, alarm clock, cream pie and more
- Grandpa talks in his sleep, walks round the furniture, throws tantrums and slips on banana peels

## Play

Get it through the [Camel Client](https://github.com/Camells1/CamelClient/releases/latest), or download
`DontWakeGrandpa-Setup.exe` from the latest release here. Windows 10 and 11.

## Build

```
npm install
npm start        # run it
npm run build    # make the installer in dist/
```

`node tools/make-voice.js` re-records Grandpa's lines (it needs Piper, see `assets/SOURCES.md`).

Built with three.js and Electron. Every model is made in code. Sound credits are in `assets/SOURCES.md`.
A Camel Studios game.
