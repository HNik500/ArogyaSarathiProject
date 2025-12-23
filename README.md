# Arogya Sarathi - Rural Health Management System

## Overview

Arogya Sarathi is a rule-based rural health management system. It provides a lightweight patient/doctor/pharmacy workflow, offline-friendly reminders, and a demo emergency hospital finder without relying on AI or heavy infrastructure.

## Project layout

- `App.tsx` — main React app and role-specific screens
- `services/` — rule-based processing and API calls (`processingService.ts` uses the backend base URL)
- `data/` — demo hospital and pharmacy data
- `backend/` — Express server that powers messaging, reminders, and delta-sync

## Prerequisites

- Node.js 18+ (recommended)
- npm 9+ (comes with recent Node versions)
- Modern browser for the frontend

## Setup

1) Install frontend dependencies  
```bash
cd Arogya_Sarathi
npm install
```

2) Install backend dependencies  
```bash
cd backend
npm install
```

## Run the application (development)

1) Start the backend (port 4000)  
```bash
cd Arogya_Sarathi/backend
node index.js
```

2) In a new terminal, start the frontend (Vite dev server, defaults to port 5173)  
```bash
cd Arogya_Sarathi
npm run dev
```

3) Open the app in your browser  
```
http://localhost:5173
```

## Configuration

- Backend port: `4000` (set inside `backend/index.js`).
- Frontend API target: `services/processingService.ts` uses `API_BASE = "http://localhost:4000"`. Change this if you run the backend on a different host/port.
- Vite dev server port: defaults to `5173`; pass `--port` to `npm run dev` if you need another port.

## Build

To create a production build of the frontend:
```bash
cd Arogya_Sarathi
npm run build
```

## Notes

- The backend stores data in-memory for demos. Restarting the server clears messages and sync packets.
- Features are deterministic and rule-based—no machine learning or external data services.
- Use separate browser sessions to simulate different roles (patient, doctor, pharmacy).

## Healthcare disclaimer

This project is for demonstration and educational purposes only. It is not intended for real medical diagnosis or treatment. Always consult qualified healthcare professionals for medical advice.
