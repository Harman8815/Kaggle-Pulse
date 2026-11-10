# Kaggle Pulse

A modern, interactive dashboard for visualizing public Kaggle activity. Built with Next.js 16, React 19, Three.js, and React Three Fiber.

## Features

- **Interactive 2D/3D Heatmap** - GitHub-style contribution calendar with Three.js 3D visualization
- **Dark/Light Mode** - Persisted theme preference with system detection
- **Activity Visualizations** - Monthly charts, activity type breakdown, recent activity feed
- **Public Profile Search** - Search any Kaggle username via `/username` route
- **Server-side Caching** - 5-minute in-memory cache with CDN-friendly headers
- **Responsive Design** - Mobile-first with ambient background decorations
- **Accessibility** - Semantic HTML, ARIA labels, keyboard navigation, reduced motion support

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Runtime**: React 19, TypeScript
- **3D Graphics**: Three.js, @react-three/fiber, @react-three/drei
- **UI Components**: Radix UI Tooltip, custom CSS
- **Styling**: Vanilla CSS with CSS custom properties
- **API**: Next.js Route Handlers, Kaggle REST API

## Getting Started

### Prerequisites

- Node.js 18.18+ or 20.9+
- Kaggle account with API credentials

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd kaggle-pulse

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Required: Kaggle API credentials (server-side only)
KAGGLE_USERNAME=your_kaggle_username
KAGGLE_API_TOKEN=your_kaggle_api_token

# Optional: Default username for home page (client-safe)
NEXT_PUBLIC_USERNAME=your_kaggle_username
```

Get your API token from [Kaggle Account Settings](https://www.kaggle.com/settings/account) → "Create New Token".

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
app/
├── [username]/           # Dynamic profile search page
│   └── page.tsx
├── api/kaggle/activity/  # Cached API route (accepts ?username=)
│   └── route.ts
├── components/
│   ├── dashboard/        # Modular dashboard components
│   │   ├── DashboardAttribution.tsx
│   │   ├── DashboardHeader.tsx
│   │   ├── DashboardSkeleton.tsx
│   │   ├── Heatmap2D.tsx
│   │   ├── Heatmap3D.tsx
│   │   ├── HeatmapPanel.tsx
│   │   ├── MonthlyChart.tsx
│   │   ├── RecentActivityPanel.tsx
│   │   ├── StatsGrid.tsx
│   │   ├── TypesPanel.tsx
│   │   ├── VisualizationGrid.tsx
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── Dashboard.tsx     # Main dashboard composition
│   ├── Navbar.tsx
│   └── Footer.tsx
├── utils/api.ts          # Typed API client
├── globals.css           # All styles
├── layout.tsx
└── page.tsx              # Home page (uses NEXT_PUBLIC_USERNAME)
```

## Usage

### Home Page (`/`)

Displays dashboard for `NEXT_PUBLIC_USERNAME` from environment. Configure in `.env.local`.

### Profile Search (`/[username]`)

Visit `/any-username` to view any public Kaggle profile. Includes search form with disclaimer.

### API Endpoint

```
GET /api/kaggle/activity?username=targetuser
```

Returns cached activity data. Cache TTL: 5 minutes.

Response:
```json
{
  "username": "targetuser",
  "profileUrl": "https://www.kaggle.com/targetuser",
  "activities": [...],
  "stats": { "total": 42, "notebooks": 20, "datasets": 22, ... },
  "cached": false
}
```

## 3D Heatmap Controls

| Control | Action |
|---------|--------|
| Mouse drag | Rotate camera |
| Scroll | Zoom in/out |
| Right-click drag | Pan |
| **Zoom In** button | Dolley in 1.2x |
| **Zoom Out** button | Dolley out 1.2x |
| **Reset** button | Return to default view |
| **Pan Toggle** | Enable/disable panning |
| **Top-Down** | Bird's-eye view |
| **Default** | Reset to angled view |

Tooltips auto-close after 3 seconds.

## Customization

### 3D Configuration

```typescript
// In Heatmap3D component
const config: Partial<Heatmap3DConfig> = {
  camera: { position: [0, 150, 150], fov: 40 },
  orbitControls: { minDistance: 10, maxDistance: 800 },
  lights: { ambientIntensity: 0.6, directionalIntensity: 1 }
};
```

### Theme Colors

CSS custom properties in `globals.css`:
```css
:root {
  --primary: #16835d;
  --bg-light: #f6f8f7;
  --bg-dark: #101713;
  /* ... */
}
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Environment Variables Reference

| Variable | Required | Scope | Description |
|----------|----------|-------|-------------|
| `KAGGLE_USERNAME` | Yes | Server | Kaggle username for API auth |
| `KAGGLE_API_TOKEN` | Yes | Server | Current API token from Kaggle |
| `NEXT_PUBLIC_USERNAME` | No | Client | Default username for home page |

## API Rate Limits

Kaggle API limits: ~100 requests/minute. The 5-minute cache prevents excessive calls. Dashboard loads 2 API calls (notebooks + datasets).

## Accessibility

- WCAG 2.1 AA contrast ratios
- Keyboard navigable (Tab, Enter, Escape)
- ARIA labels on all interactive elements
- `prefers-reduced-motion` disables animations
- Semantic HTML structure
- Screen reader compatible

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## Acknowledgments

- [Kaggle API](https://www.kaggle.com/docs/api) for data
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) for 3D
- [Radix UI](https://www.radix-ui.com/) for accessible primitives
- [Next.js](https://nextjs.org/) for the framework