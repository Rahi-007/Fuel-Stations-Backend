# FuelMap.bd

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green)](https://github.com/yourusername/fuelmap)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js-orange)](https://nextjs.org/)
[![Backend](https://img.shields.io/badge/Backend-NestJS-blueviolet)](https://nestjs.com/)

## Overview
FuelMap.bd is a web application that helps users in Bangladesh locate nearby fuel stations, check real-time fuel availability, and plan their refueling trips efficiently. The platform supports both petrol and diesel stations and provides location-based search for convenience.

---

## Features
- 🌐 Find nearby petrol and diesel stations in Bangladesh  
- ⛽ Check real-time fuel availability  
- 📍 Map-based station locations  
- 🔎 Search fuel stations by city or district  
- 📝 Optional: User login/signup for personalized experience  

---

## Technology Stack
- **Frontend:** Next.js, TypeScript, TailwindCSS  
- **Backend:** NestJS, PostgreSQL, MicroORM  
- **Authentication:** JWT-based login/signup  
- **Mapping:** Google Maps API (or OpenStreetMap)  
- **Deployment:** Vercel / Heroku  

---

## Installation & Setup

1. Clone the repository

```bash
git clone https://github.com/Rahi-007/Fuel-Stations.git
```

2. Install frontend dependencies
```bash
cd frontend
npm install
```

3. Install backend dependencies
```bash
cd backend
npm install
```

4. Configure environment variables
```bash
# Copy the .env.example file to .env and update values if needed
```

5. Run the project
```bash
# Backend
cd backend
npm run start:dev

# Frontend
cd frontend
npm run dev
```