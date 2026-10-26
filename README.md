# Tumble

A browser game inspired by Tetris Tumble XL: place tetrominoes on a rocking, zigzag base and try not to topple the tower. 1 or 2 players (hot-seat), desktop and phone. Vanilla JS, Canvas 2D, no dependencies, no build step. Design details are in [spec.md](spec.md).

## Run

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

It must be served over HTTP. ES modules do not load from `file://`.

## Test

```sh
npm test    # node --test, no install needed
```

## Controls

| Action | Desktop | Phone |
|---|---|---|
| Aim | Mouse | Drag |
| Place | Click or Enter | Place button |
| Rotate | R, right-click, wheel | Rotate button |
| Flip | F / V | Flip buttons (easy mode) |
| Nudge | Arrows (Shift for diagonal) | n/a |
| Cancel | Esc | Cancel button |
| Zoom | `+` `-` `0` | Zoom buttons |

## Deploy on Render

Render hosts this as a free static site.

1. Push the repo to GitHub, GitLab or Bitbucket.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New > Static Site** and connect the repo.
3. Set the branch to deploy.
4. Leave **Build Command** blank and set **Publish Directory** to `.`
5. Click **Create Static Site**.

Render gives the site an `onrender.com` URL and redeploys on every push to the branch.

Note: publishing `.` serves the whole repo, including `spec.md` and `test/`. To publish only the game, move `index.html`, `style.css` and `src/` into a `public/` folder and set **Publish Directory** to `public`.
