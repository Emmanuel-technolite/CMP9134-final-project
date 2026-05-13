# Virtual Robot Management System (GCS)

This is the software infrastructure that connects to, monitors, and controls the Virtual Robot Simulation as required by the **CMP9134 Software Engineering** Assessment 1 module.

## Features Included
1. **Containerised Stack**: Easy setup via `docker-compose`. 
2. **FastAPI Backend**: Uses the Singleton and Observer patterns to handle connectivity with the Robot API robustly.
3. **SQLite Auditing**: Securely stores usernames with hashed passwords via `bcrypt`, and persistently logs every command request to provide a transparent Mission Audit Trail. 
4. **RBAC Security**: Role-Based Access Control enforcing "Viewer" vs "Commander" privileges using `JWT` tokens.
5. **Modern Dashboard UI**: Built with pure HTML/JS/CSS (no bloated frameworks), featuring a glassmorphism theme, dynamic 21x21 grid updates, and animated connection status indicators.

## Running the Application

### Prerequisites
- Docker & Docker Compose installed on your system.
- An active internet connection to pull the robot simulator image from `ghcr.io/francescodelduchetto`.

### Setup Instructions
1. Open up a terminal in this directory.
2. Run the deployment container stack:
   ```bash
   docker compose up --build -d
   ```
   *(Note: Old versions of docker might require `docker-compose` with a hyphen).*
3. The mock robot simulator will boot up on port `5000` internally, and the Ground Control API + Dashboard will launch on port `8000`.
4. Open your web browser and navigate to:
   ```text
   http://localhost:8000
   ```
5. You can now visually Register a new user on the UI.
   - For read-only mode, select the `Viewer` role.
   - For full control, select the `Commander` role.

The backend will proxy all Robot telemetry requests dynamically, abstracting the API mechanics securely behind the GCS.
