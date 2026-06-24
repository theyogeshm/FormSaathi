<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# FormSaathi

This repository contains the code for FormSaathi, which simplifies banking by filling complex forms in 30 seconds using advanced Vision AI and local voice interfaces.

All frontend application files are now contained in the `frontend/` directory.

View your app in AI Studio: https://ai.studio/apps/c9bee0de-fff3-483f-abd0-fe8b3863d740

## Project Structure

```text
formsaathi/
├── frontend/             # All frontend application files (React, Vite, configs)
│   ├── src/              # React source files
│   ├── assets/           # Static asset templates
│   ├── data/             # CSV and static data resources
│   ├── index.html        # Vite entrypoint
│   ├── package.json      # Dependencies and scripts
│   ├── vite.config.ts    # Vite configurations
│   └── ...
├── README.md             # General project README (this file)
└── metadata.json         # Workspace metadata
```

## Running Locally

To run the application locally:

1. **Navigate to the frontend folder**:
   ```bash
   cd frontend
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Set your environment variables**:
   Create a `.env.local` file in the `frontend` folder and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
4. **Start the development server**:
   ```bash
   npm run dev
   ```

## Deploying to Render

This app is configured to be deployed as a **Static Site** on Render. Follow these configuration steps:

1. Create a new **Static Site** on Render and connect your GitHub repository.
2. In the deployment settings, configure the following:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. Add any environment variables (e.g., `GEMINI_API_KEY`) in the Environment section of your Render service.
