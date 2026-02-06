# Lifestream

AI-powered life path exploration. Visualize your possible futures with personalized decision trees.

## Features

- **Decision Tree Explorer** (`/explore`) - Enter your current situation and let Claude AI generate personalized career and life paths
- **Monte Carlo Simulation** (`/`) - Visualize probabilistic life trajectories with a Sankey flow diagram
- **Real-time AI Generation** - Powered by Claude Opus 4.5 via AWS Bedrock
- **Interactive Visualization** - Click nodes to explore, sort by salary/probability/growth

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure AWS Bedrock

Copy `.env.example` to `.env` and add your AWS credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000/explore](http://localhost:3000/explore) to start exploring your future.

## Tech Stack

- **Next.js 14** - React framework
- **AWS Bedrock** - Claude AI integration
- **D3.js** - Sankey diagram visualization
- **React Three Fiber** - 3D checkpoint icons
- **Zustand** - State management
- **Tailwind CSS** - Styling

## Project Structure

```
src/
├── app/
│   ├── api/generate-paths/  # Bedrock API route
│   ├── explore/             # Decision tree explorer
│   └── page.tsx             # Monte Carlo simulation
├── components/
│   ├── tree/                # Decision tree visualization
│   ├── sankey/              # Sankey flow diagram
│   └── ...
├── engine/
│   ├── DecisionTree.ts      # Decision tree logic
│   ├── MonteCarlo.ts        # Monte Carlo simulation
│   └── StateVector.ts       # Life state representation
└── store/
    └── useDecisionTreeStore.ts
```

## License

MIT
