# Robo Race Leaderboard

Live leaderboard for TechFiesta Robo Race (TENET '26), built for a vertical 1080x1920 screen.

## Run

    npm install
    npm run build
    npm start

The terminal prints the URLs.

- Display (open on the Android screen): `http://<laptop-lan-ip>:3000/`
- Admin (open on the laptop): `http://localhost:3000/admin`

Edits made in the admin appear on the display instantly (server-sent events). Data is stored in `data/state.json`.
Changes are only accepted from localhost and private LAN addresses.

For development use `npm run dev` (Vite on :5173, API on :3000).

## Scoring

Final time = run time + penalties x penalty seconds (default 10). Only teams marked Finished with a run time are ranked; ties share a rank.
With more than 10 teams the display rotates pages every 12 seconds.
