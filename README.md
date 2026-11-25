# UNBOUND

*No Rules. No Limits. Your World.*

[Play UNBOUND in your browser](https://cgupta21.github.io/UNBOUND/)

Explore a coastal city on foot, drive cars and motorcycles, pilot a helicopter, or take a speedboat out past the beach. Talk to locals inside the hotel and shops to start missions. Police can pursue you by road, air, and sea. Progress saves in the browser on the device where you play.

## Controls

| Action | Key |
| --- | --- |
| Walk, drive, steer or fly forward | WASD or arrow keys |
| Board or exit a vehicle | F or Enter |
| Talk, open doors or complete a handoff | E |
| Sprint on foot | Shift |
| Climb or descend in the helicopter | Space / C |
| Open map / jobs / controls | M / J / H |
| Pause | Esc |

Touch controls appear on supported touchscreens. A WebGL-capable browser is required.

## Local play and development

Open **UNBOUND.html** for offline play. Edit the game files in **src/**, then rebuild both the offline edition and the Pages entry point with Node.js:

~~~sh
node build.cjs
node --test tests/world.test.cjs
~~~

GitHub Pages serves **docs/index.html** from **main**. The browser playthrough in **tests/browser.cjs** uses Playwright with Microsoft Edge. Set **PALM_PLAYWRIGHT** to the installed Playwright module path if it is outside the normal Node module search path.
