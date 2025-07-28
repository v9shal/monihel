
Monihel is a comprehensive, open-source application designed for real-time monitoring of API endpoints. Built from the ground up with a modern, scalable technology stack, it provides users with instant status updates, performance metrics, and a robust alerting system.

This project showcases a complete, production-ready architecture, from a secure, multi-tenant backend and decoupled background workers to a dynamic, real-time React frontend, all fully containerized with Docker for easy deployment.


## Features

- User Authentication: Secure user registration and login using JWTs stored in `HttpOnly` cookies
- Endpoint CRUD: Users can create, read, update, delete, pause, and resume monitoring for their own API endpoints.
- Real-Time Monitoring: A background worker system continuously pings endpoints to check their status and response time.
- Live Dashboard: The frontend dashboard updates instantly with new status information via a WebSocket connection, without needing a page refresh.
- Stateful Alerting: A decoupled worker sends real email notifications (using Nodemailer and Gmail) when an endpoint's failure threshold is met and when it recovers.
- Data Persistence: Uses PostgreSQL with the TimescaleDB extension for efficient storage and querying of time-series metrics.
- Scalable architecture: Leverages Redis for both background job queuing (BullMQ) and a real-time Pub/Sub messaging bus to decouple services.
-  The entire application stack (Frontend, Backend API, Workers, Database, Redis) is containerized with Docker and orchestrated with Docker Compose for production.


## Technical Stack

This project is divided into two main parts: the backend service and the frontend application.

### Backend

- Runtime: Node.js with TypeScript
- Framework: Express.js
- Database: PostgreSQL + TimescaleDB extension
- In-Memory Store: Redis
- ORM: Prisma
- Job Queue: BullMQ
- Real-Time Messaging: Redis Pub/Sub
- Authentication: JSON Web Tokens (JWT), `bcryptjs`, `cookie-parser`
- Email: Nodemailer

### Frontend

- Framework: React with TypeScript
- State Management: Redux Toolkit
- Real-Time Communication: Socket.IO Client


- Containerization: Docker & Docker Compose
- Web Server/Proxy: Nginx
- Deployment Target: AWS EC2 (Ubuntu)

---

## Getting Started

### Prerequisites

- Nodejs: v18 or later
- Docker and Docker Compose
- A running PostgreSQL and Redis instance (can be started via Docker)
- A Gmail account with an "App Password" generated for email alerting.

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/v9shal/monihel.git
    cd monihel
    ```

2.  Setup Backend:
    cd backend
    npm install
    # Create a .env file based on the schema and add your secrets
    npx prisma generate
    npx prisma migrate dev

3.  Setup Frontend:
    cd ../frontend
    npm install

4.   Run the application (in separate terminals):
    # Terminal 1: Backend Server
    cd backend && npm run dev

    # Terminal 2: Ping Worker
    cd backend && npm run dev:worker
    
    # Terminal 3: Alert Worker
    cd backend && npm run dev:alerter

    # Terminal 4: Frontend
    cd frontend && npm run dev

### Production Deployment (Docker)

This project is configured for a full production deployment using Docker Compose.

1.   Build the production code:
    # In the /backend directory
    npm run build

    # In the /frontend directory
    npm run build

2.  Create the backend ".env" file:

3.     Run Docker Compose:
    From the root project directory, run:
    docker-compose -f docker-compose.prod.yml up --build -d

---

- Project created by Vishal Sethi.