# Kaggle Pulse

**Explore Kaggle creators, track contributions, compare profiles, and discover community trends.**

Kaggle Pulse is an interactive dashboard for exploring public Kaggle creator activity and profile insights. It brings contribution tracking, creator comparisons, historical growth, and community analytics into one place.

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" />
  <img src="https://img.shields.io/badge/Three.js-3D-black?logo=threedotjs" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

## Features

| Feature | Description |
|---|---|
| Creator Dashboard | Profile overview, statistics, contribution heatmaps, and recent activity. |
| Profile Search | Explore public Kaggle activity using any username. |
| 2D & 3D Heatmaps | Visualize contribution activity through interactive heatmaps. |
| Head-to-Head | Compare creators, topic overlap, and account-age context. |
| Personal History | Track profile snapshots and growth over time. |
| Cohorts & Topic Pulse | Explore tracked-sample percentiles and observed topic trends. |
| Network & Atlas | Discover collaboration signals and creator communities. |
| Responsive UI | Light/dark themes, accessible controls, and responsive layouts. |

## Preview

<!-- Add project screenshots here -->

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Frontend:** React 19, TypeScript
- **3D Visualization:** Three.js, React Three Fiber, Drei
- **UI:** Radix UI, Custom CSS
- **API:** Next.js Route Handlers, Kaggle REST API
- **Data:** Kaggle public profile and activity information

## Getting Started

### Prerequisites

- Node.js 20.9+
- Kaggle account
- Kaggle API token

### Installation

```bash
git clone <repository-url>
cd kaggle-pulse
npm install
cp .env.example .env.local
```

### Environment Variables

Configure `.env.local`:

```env
KAGGLE_API_TOKEN=your_kaggle_api_token
NEXT_PUBLIC_USERNAME=your_kaggle_username

# Optional
CRON_SECRET=your_random_secret
KAGGLE_TRACKED_USERS=username_one,username_two
KAGGLE_DATA_DIR=/var/data/kaggle-foundation
```

Generate your API token from [Kaggle Account Settings](https://www.kaggle.com/settings/account).

Keep API credentials server-side. Never commit `.env.local` or expose your API token through client-side variables.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Usage

**Dashboard**

Visit `/` to explore the default Kaggle profile configured through `NEXT_PUBLIC_USERNAME`.

**Profile Search**

Visit `/<username>` to explore another public Kaggle creator.

Example:

```text
https://your-domain.com/username
```

**API Endpoint**

```http
GET /api/kaggle/activity?username=targetuser
```

Returns profile activity, contribution statistics, and cached data.

## Project Structure

```text
app/
├── [username]/             # Dynamic profile search
├── api/
│   └── kaggle/
│       ├── activity/       # Activity API
│       └── snapshots/      # Historical snapshots
├── components/
│   ├── dashboard/          # Dashboard visualizations
│   ├── Dashboard.tsx
│   ├── Navbar.tsx
│   └── Footer.tsx
├── utils/
│   └── api.ts
├── globals.css
├── layout.tsx
└── page.tsx
```

## Deployment

Kaggle Pulse supports deployment on platforms such as **Vercel** and **Netlify**.

1. Push the project to GitHub.
2. Import the repository into your deployment platform.
3. Configure the required environment variables.
4. Build and deploy.

**Note:** Historical snapshots require persistent storage for reliable long-term retention. Serverless filesystem storage may be temporary. Configure a persistent volume or database-backed storage for durable history.

## Accessibility

- Keyboard navigation support.
- Accessible interactive controls and ARIA labels.
- Reduced-motion support.
- Responsive layouts.
- Semantic HTML structure.

## Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a feature branch.
3. Make your changes and test them.
4. Submit a pull request.

## Acknowledgments

- [Kaggle API](https://www.kaggle.com/docs/api)
- [Next.js](https://nextjs.org/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Radix UI](https://www.radix-ui.com/)

## License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Built with curiosity for the Kaggle community.
</p>