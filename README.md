# FoodWise — Hostel Food Wastage Analytics & Demand Prediction System

A full-stack DBMS project built with **Node.js (Express)**, **MySQL**, and **vanilla HTML/CSS/JS**.

---

## What This Project Does

FoodWise helps hostel food managers:
- **Track** meals, attendance, food prepared, and food consumed
- **Auto-calculate wastage** using a MySQL TRIGGER
- **Analyze** wastage patterns using SQL JOINs, GROUP BY, aggregate functions
- **Predict** future food demand based on historical averages
- **View** everything on a clean web dashboard

---

## Project Structure

```
foodwise/
│
├── server.js              ← Main server file (run this!)
│
├── package.json           ← Project dependencies
│
├── db/
│   ├── schema.sql         ← Database setup (tables, trigger, procedure)
│   └── connection.js      ← MySQL connection module
│
├── routes/
│   ├── meals.js           ← Routes: POST /meal, GET /meals
│   ├── attendance.js      ← Routes: POST /attendance, GET /attendance
│   ├── food.js            ← Routes: POST /prepared, POST /consumed
│   ├── wastage.js         ← Routes: GET /wastage, /wastage/summary
│   └── predictions.js     ← Routes: GET /predictions/auto
│
└── public/
    └── index.html         ← The entire frontend (HTML + CSS + JS)
```

---

## Setup & Run Instructions

### Step 1: Install Prerequisites
- Install [Node.js](https://nodejs.org) (v16 or higher)
- Install [MySQL](https://dev.mysql.com/downloads/) (v8.0+)
- Install [MySQL Workbench](https://www.mysql.com/products/workbench/) (optional, for GUI)

### Step 2: Set Up the Database
Open MySQL (terminal or Workbench) and run:
```sql
source /path/to/foodwise/db/schema.sql
```
Or paste the contents of `db/schema.sql` manually.

This will:
- Create the `foodwise_db` database
- Create all 6 tables
- Create the auto-wastage **TRIGGER**
- Create a **Stored Procedure** and **Function**
- Insert **sample data**

### Step 3: Configure Database Credentials
Open `db/connection.js` and update:
```js
const pool = mysql.createPool({
    host:     'localhost',
    user:     'root',        // ← your MySQL username
    password: '',            // ← your MySQL password
    database: 'foodwise_db'
});
```

### Step 4: Install Node.js Packages
```bash
cd foodwise
npm install
```

### Step 5: Start the Server
```bash
node server.js
```
You should see:
```
Succesfully connected to MySQL database: foodwise_db
FoodWise Server Started!
Running at: http://localhost:3000
```

### Step 6: Open the App
Visit: **http://localhost:3000**

---

## API Endpoints (REST API)

| Method | URL                    | Description                        |
|--------|------------------------|------------------------------------|
| POST   | /meal                  | Add a new meal                     |
| GET    | /meals                 | Get all meals with full data       |
| POST   | /attendance            | Record student attendance          |
| GET    | /attendance/avg        | Average attendance by meal type    |
| POST   | /food/prepared         | Record food prepared (kg)          |
| POST   | /food/consumed         | Record food consumed (triggers wastage!) |
| GET    | /wastage               | Full wastage analysis              |
| GET    | /wastage/summary       | GROUP BY meal type summary         |
| GET    | /wastage/stats         | Overall stats + stored function    |
| POST   | /wastage/report        | Date-range report (stored procedure) |
| GET    | /predictions/auto      | Auto-generate prediction           |
| POST   | /predictions           | Save manual prediction             |

---

## Database Design

### Tables
```
Meal            → meal_id (PK), meal_date, meal_type
Attendance      → attendance_id (PK), students_present, meal_id (FK)
Food_Prepared   → prepared_id (PK), quantity_prepared_kg, meal_id (FK)
Food_Consumed   → consumed_id (PK), quantity_consumed_kg, meal_id (FK)
Wastage_Log     → wastage_id (PK), wastage_kg, recorded_time, meal_id (FK)
Prediction      → prediction_id (PK), prediction_date, meal_type, ...
```

### Advanced DBMS Features Used
| Feature | Where |
|---------|-------|
| **TRIGGER** | `after_consumed_insert` — auto-fills Wastage_Log |
| **Stored Procedure** | `GetWastageReport(start, end)` — date-range report |
| **Stored Function** | `GetAvgWastePerStudent()` — returns a scalar value |
| **JOIN** | All dashboard queries use LEFT JOIN across 5 tables |
| **GROUP BY** | Attendance averages, wastage summaries by meal type |
| **Aggregate Functions** | AVG, SUM, MAX, MIN, COUNT |
| **COALESCE** | Handle NULL values gracefully |
| **CASE WHEN** | Calculate wastage percentage |

---

## Sample SQL Queries

### 1. Wastage Calculation (JOIN 5 tables)
```sql
SELECT m.meal_date, m.meal_type,
       fp.quantity_prepared_kg,
       fc.quantity_consumed_kg,
       wl.wastage_kg
FROM Meal m
LEFT JOIN Food_Prepared fp ON m.meal_id = fp.meal_id
LEFT JOIN Food_Consumed fc ON m.meal_id = fc.meal_id
LEFT JOIN Wastage_Log   wl ON m.meal_id = wl.meal_id;
```

### 2. Average Attendance per Meal Type (GROUP BY)
```sql
SELECT m.meal_type, AVG(a.students_present) AS avg_students
FROM Attendance a
JOIN Meal m ON a.meal_id = m.meal_id
GROUP BY m.meal_type;
```

### 3. Call Stored Procedure
```sql
CALL GetWastageReport('2024-06-01', '2024-06-30');
```

### 4. Call Stored Function
```sql
SELECT GetAvgWastePerStudent();
```

---

## Testing with Sample Data

After running `schema.sql`, sample data is already inserted. You can:

1. Open http://localhost:3000
2. Click **Dashboard** to see stats
3. Click **Wastage Report** to see the analysis
4. Click **Predictions → Generate Smart Prediction**

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MySQL 8.0
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (no frameworks!)
- **ORM:** None (raw SQL with mysql2 driver)

---

## DBMS Concepts Demonstrated

1. Entity-Relationship Design (6 normalized tables)
2. Primary Keys & Foreign Keys
3. Referential Integrity (ON DELETE CASCADE)
4. TRIGGER (automatic wastage calculation)
5. Stored Procedure (parameterized report)
6. Stored Function (scalar return)
7. Multi-table JOINs (LEFT JOIN, INNER JOIN)
8. GROUP BY with aggregate functions
9. COALESCE for NULL handling
10. CASE WHEN logical condition
11. REST API design
12. CRUD operations

---

## Author
Navjot Singh, Shaina Gera, Moksh
