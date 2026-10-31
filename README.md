# LocoMuv

A neighborhood-based micro-delivery and local task network for Bangladesh. Customers can post local tasks, and nearby runners can accept them or submit price offers. Both pickup and delivery are verified using separate OTPs.

## Technology Stack

- React 18, Vite, Tailwind CSS, React Leaflet, and Recharts
- Node.js, Express, Mongoose, and MongoDB
- JWT sessions stored in HttpOnly cookies and bcrypt password hashing
- GeoJSON Point and `2dsphere` indexes for finding nearby tasks

## Requirements

- Node.js 18 or later
- A local MongoDB server or MongoDB Atlas

## Setup

1. Install dependencies in the root, `server`, and `client` directories:

   ```sh
   npm run install:all
   ```

2. Copy `server/.env.example` to `server/.env`. Set your own values for `MONGO_URI`, `JWT_SECRET`, and `OTP_SECRET`. For OTP security, keep `OTP_SECRET` separate from the JWT secret.

3. Start the application in two separate terminals:

   ```sh
   npm run dev:server
   npm run dev:client
   ```

4. Open `http://localhost:5173` and create an account as a customer or runner. During development, Vite forwards `/api` requests to the server running at `http://localhost:5000`.

### Demo Accounts

To create customer, runner, and admin demo accounts in a local MongoDB database, set the following value in `server/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/parasync
```

Then run:

```sh
npm run seed:demo --prefix server
```

Demo login credentials:

| Role | Email | Password |
|---|---|---|
| Customer | `customer@gmail.com` | `customer` |
| Runner | `runner@gmail.com` | `runner12` |
| Admin | `admin@gmail.com` | `admin123` |

These weak demo passwords and the demo admin account are intended for local development only. The script refuses to create accounts in production environments or in MongoDB instances hosted outside localhost.

The admin dashboard allows administrators to view all accounts and temporarily deactivate or reactivate customer and runner accounts.

### Setting Up an Admin Account for a Remote Database

To create a separate admin account for Atlas or another remote database, configure the following values in `server/.env`:

```env
ALLOW_ADMIN_SETUP=true
ADMIN_NAME=Your Admin Name
ADMIN_EMAIL=your-admin@example.com
ADMIN_PHONE=Your Admin Phone
ADMIN_PASSWORD=YourStrongPassword
```

The admin password must contain at least 12 characters.

Run the following command:

```sh
npm run setup:admin --prefix server
```

This command creates an admin account only when explicit permission and a strong new password are provided. It does not modify existing users or promote existing accounts to admin.

After setup, remove `ALLOW_ADMIN_SETUP` and the admin bootstrap values from `.env`.

Never use demo passwords such as `admin123` with remote or production databases.

## Features

- Customer and runner registration. Only names, email addresses, phone numbers, and passwords are collected. NID or national identity card information is not collected.
- Customers can post tasks with descriptions, estimated budgets, pickup addresses, and delivery addresses. Locations are selected by placing pins on a zoomable map instead of entering coordinates manually.
- Runners can view open tasks within a 5 km radius and within their financial limits using MongoDB's `$near` operator, provided they grant browser location access.
- Runners can directly accept tasks or submit one price and time offer per task.
- After a task is accepted, the customer receives a pickup OTP and a delivery OTP. The runner verifies the pickup using the first OTP and confirms completion using the second OTP.
- OTP verification is temporarily blocked for 15 minutes after five incorrect attempts.
- New runners start with a trust score of 100 and a task limit of ৳500. Successful tasks increase their score and limit, while runner cancellations and disputes resolved against the runner decrease them.
- Task cancellation, dispute reporting, and administrative dispute resolution.
- Dashboards featuring task summaries, recent activities, and charts.

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a customer or runner account |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/logout` | Log out |
| `GET` | `/api/auth/me` | Get the current user |
| `GET` | `/api/dashboard` | Get task summaries and recent activity |
| `POST` / `GET` | `/api/tasks` | Create a task / List the user's own tasks |
| `DELETE` | `/api/tasks/:taskId` | Delete the user's own pending task that has not been accepted by a runner |
| `GET` | `/api/tasks/nearby?lat=...&lng=...&radiusKm=5` | Find nearby tasks for a runner |
| `POST` | `/api/tasks/:taskId/accept` | Directly accept a task |
| `POST` / `GET` | `/api/tasks/:taskId/bids` | Create a price offer / List offers |
| `POST` | `/api/tasks/:taskId/bids/:bidId/accept` | Accept a runner's offer |
| `POST` | `/api/tasks/:taskId/pickup-otp` | Verify the pickup OTP |
| `PATCH` | `/api/tasks/:taskId/status` | Update the runner's delivery status |
| `POST` | `/api/tasks/:taskId/delivery-otp` | Verify the delivery OTP |
| `POST` | `/api/tasks/:taskId/cancel` | Cancel a task |
| `POST` | `/api/tasks/:taskId/disputes` | Report a dispute |
| `POST` | `/api/tasks/:taskId/disputes/resolve` | Resolve a dispute as an administrator |

After pickup OTP verification, the runner progresses through the following delivery stages in order:

`picked-up` → `in-transit` → `arriving`

The task is marked as `completed` after the delivery OTP is verified.

The customer's task list automatically refreshes its status every 15 seconds.

OTP values are not included in ordinary API responses. Only the customer associated with an active task can view that task's OTPs.

OTP data is encrypted in the database using AES-256-GCM.

## Data Models

- `server/src/models/User.js`: User identity, role, password hash, trust score, and runner task limit.
- `server/src/models/Task.js`: Task details, GeoJSON locations, status, encrypted OTPs, and disputes.
- `server/src/models/Bid.js`: Runner offers, with one offer per runner for each task.

## Manual Testing

1. Create two accounts: one customer and one runner.
2. Log in as a customer and post a task. Enter the addresses and place pins on the map for pickup and delivery, or use the current location. Keep the budget within the new runner's ৳500 limit.
3. Log in as a runner and share your location. View nearby tasks in the list and on the map.
4. Accept the task directly or submit a price offer. Log in as the customer and accept the offer. You should see both OTPs on the active task card.
5. Log in as the runner and verify the pickup OTP and delivery OTP. Test the verification limit by entering an incorrect OTP five times.
6. To test task cancellation and dispute reporting or resolution, configure an admin account separately in the database. Public registration does not allow admin account creation.
7. Test the navigation, forms, task lists, and maps in the mobile view.

## Build and Run

Build the application:

```sh
npm run build
```

Start the application:

```sh
npm start
```

Set `NODE_ENV=production` in production environments.

In production, the Express server serves the React build from the same origin.