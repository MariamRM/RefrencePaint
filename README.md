# Reference Timer

Simple drawing reference timer website:

- Upload multiple images
- Set one time per image
- Auto-switch to the next image when time ends
- Show `Done` after the last image
- Run the same image set again without re-uploading

## Run locally

Open `index.html` in a browser.

## Deploy to Render

This project is ready to deploy as a static site on Render.

### Option 1: Using `render.yaml`

1. Put this folder in a GitHub repository.
2. Push the files to GitHub.
3. In Render, create a new Blueprint service.
4. Connect your GitHub repo.
5. Render will read `render.yaml` and deploy the site.

### Option 2: Manual Static Site

1. Put this folder in a GitHub repository.
2. In Render, click `New +`.
3. Choose `Static Site`.
4. Connect your GitHub repo.
5. Use these settings:
   - Build Command: leave empty
   - Publish Directory: `.`
6. Deploy.

## Files

- `index.html`
- `styles.css`
- `app.js`
- `render.yaml`
