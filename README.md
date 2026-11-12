# FoodWise — Hostel Food Wastage Analytics & Demand Prediction System

A full-stack DBMS project built with **Node.js (Express)**, **MySQL 8.0**, and **vanilla HTML/CSS/JS**.

---

## What This Project Does

FoodWise helps hostel food managers:
- **Track** meals, student attendance, food prepared, and food consumed in a guided 4-step workflow
- **Auto-calculate wastage** using MySQL triggers (`trg_calculate_wastage` + update/recalculation triggers)
- **Audit changes** automatically across tables via `Audit_Log` triggers
- **Analyze** wastage by meal type, daily trend, and date-range stored procedure (`sp_wastage_report`)
- **Predict** future food demand (`GetAutoPredictions()`) and manage saved forecasts
- **Manage records** with full create, read, edit, and delete (CRUD) support in the dashboard

---

## Project Structure

```
foodwise/
│
├── server.js              ← Express entrypoint & /health check
├── package.json           ← Dependencies & npm scripts (start, dev, check, test)
├── .env.example           ← Environment variable template
│
├── db/
│   ├── schema.sql         ← Database setup (tables, triggers, views, procedures, seed data)
│   └── connection.js      ← MySQL connection pool (dotenv-configured)
│
├── utils/
│   └── validators.js      ← Shared input validation & DB lookup helpers
│
├── routes/
│   ├── meals.js           ← GET/POST /meals, GET/PUT/DELETE /meals/:id
│   ├── attendance.js      ← GET /attendance, GET /attendance/avg, POST /attendance
│   ├── food.js            ← POST /food/prepared, POST /food/consumed (+ aliases)
│   ├── wastage.js         ← GET /wastage, /summary, /trend, /stats, /audit, POST /report
│   └── predictions.js     ← GET /predictions/auto, GET/POST /predictions, PUT/DELETE /predictions/:id
│
├── public/
│   └── index.html         ← Single-page dashboard & analytics UI
│
└── tests/
    ├── validators.test.js ← Unit tests for input validators
    ├── schema.test.js     ← SQL schema & constraint verification
    └── routes.test.js     ← Route & UI contract tests
```

---

## Setup & Run Instructions

### Step 1: Prerequisites
- [Node.js](https://nodejs.org) (v18+ recommended; v22 verified)
- [MySQL](https://dev.mysql.com/downloads/) (v8.0+)

### Step 2: Set Up the Database
Run `db/schema.sql` in MySQL (CLI or MySQL Workbench):
```sql
source /path/to/foodwise/db/schema.sql
```
This creates `foodwise_db` with all 7 tables, wastage & audit triggers, 3 views, 2 stored procedures, and sample seed data.

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` and fill in your MySQL credentials:
```bash
cp .env.example .env
```
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=foodwise_db
```

### Step 4: Install Packages & Verify
```bash
npm install
npm run check
npm test
```

### Step 5: Start the Server
```bash
npm start
```
Visit **http://localhost:3000**.

---

## API Endpoints (REST API)

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/health` | Server and MySQL connectivity check |
| GET | `/meals` | List all meals from `vw_meal_summary` |
| GET | `/meals/:id` | Fetch a single meal summary |
| POST | `/meals` | Create a meal (`meal_date`, `meal_type`) |
| PUT | `/meals/:id` | Update a meal's date or type |
| DELETE | `/meals/:id` | Delete a meal (cascades child logs) |
| GET | `/attendance` | List attendance records with meal info |
| GET | `/attendance/avg` | Average, min, max attendance by `meal_type` |
| POST | `/attendance` | Record or update attendance for a `meal_id` |
| POST | `/food/prepared` | Record or update prepared quantity (kg) |
| POST | `/food/consumed` | Record or update consumed quantity (triggers wastage) |
| GET | `/wastage` | Full wastage log from `vw_meal_summary` |
| GET | `/wastage/summary` | Meal-type summary from `vw_wastage_by_type` |
| GET | `/wastage/trend` | Daily wastage totals from `vw_daily_trend` |
| GET | `/wastage/stats` | Overall dashboard KPIs |
| POST | `/wastage/report` | Date-range report via `sp_wastage_report` |
| GET | `/wastage/audit` | Latest 50 rows from `Audit_Log` |
| GET | `/predictions/auto` | Smart demand predictions via `GetAutoPredictions()` |
| GET | `/predictions` | List saved predictions |
| POST | `/predictions` | Save a manual or generated prediction |
| PUT | `/predictions/:id` | Update a saved prediction |
| DELETE | `/predictions/:id` | Delete a saved prediction |

---

## Database Design

### Tables (1:1 per Meal enforced on child logs)
- `Meal` (`meal_id`, `meal_date`, `meal_type`, `created_at`, unique `(meal_date, meal_type)`)
- `Attendance` (`attendance_id`, unique `meal_id`, `students_present`)
- `Food_Prepared` (`prepared_id`, unique `meal_id`, `quantity_prepared_kg`)
- `Food_Consumed` (`consumed_id`, unique `meal_id`, `quantity_consumed_kg`)
- `Wastage_Log` (`wastage_id`, unique `meal_id`, `wastage_kg`, `recorded_time`)
- `Prediction` (`prediction_id`, `prediction_date`, `meal_type`, `predicted_students`, `standard_estimate_kg`, `historical_avg_kg`, `suggested_quantity_kg`, `created_at`)
- `Audit_Log` (`audit_id`, `table_name`, `action`, `record_id`, `changed_by`, `changed_at`)

### Views, Triggers & Stored Procedures
- **Triggers**: `trg_calculate_wastage` (+ insert/update/delete sync triggers between `Food_Prepared`, `Food_Consumed`, and `Wastage_Log`) and `trg_audit_*` triggers populating `Audit_Log`.
- **Views**: `vw_meal_summary`, `vw_wastage_by_type`, `vw_daily_trend`.
- **Stored Procedures**: `GetAutoPredictions()`, `sp_wastage_report(start_date, end_date, hostel_id)`.

---

## Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MySQL 8.0 (`mysql2`, raw SQL)
- **Frontend:** HTML5, CSS3, Vanilla JavaScript

---

## Authors
Navjot Singh, Shaina Gera, Moksh
