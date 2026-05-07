DROP DATABASE IF EXISTS foodwise_db;
CREATE DATABASE foodwise_db;
USE foodwise_db;

CREATE TABLE Meal (
    meal_id    INT AUTO_INCREMENT PRIMARY KEY,
    meal_date  DATE NOT NULL,
    meal_type  ENUM('Breakfast','Lunch','Dinner') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Attendance (
    attendance_id    INT AUTO_INCREMENT PRIMARY KEY,
    meal_id          INT NOT NULL,
    students_present INT NOT NULL CHECK (students_present >= 0),
    FOREIGN KEY (meal_id) REFERENCES Meal(meal_id) ON DELETE CASCADE
);

CREATE TABLE Food_Prepared (
    prepared_id          INT AUTO_INCREMENT PRIMARY KEY,
    meal_id              INT NOT NULL,
    quantity_prepared_kg DECIMAL(8,2) NOT NULL CHECK (quantity_prepared_kg > 0),
    FOREIGN KEY (meal_id) REFERENCES Meal(meal_id) ON DELETE CASCADE
);

CREATE TABLE Food_Consumed (
    consumed_id          INT AUTO_INCREMENT PRIMARY KEY,
    meal_id              INT NOT NULL,
    quantity_consumed_kg DECIMAL(8,2) NOT NULL CHECK (quantity_consumed_kg >= 0),
    FOREIGN KEY (meal_id) REFERENCES Meal(meal_id) ON DELETE CASCADE
);

CREATE TABLE Wastage_Log (
    wastage_id    INT AUTO_INCREMENT PRIMARY KEY,
    meal_id       INT NOT NULL,
    wastage_kg    DECIMAL(8,2) NOT NULL,
    recorded_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meal_id) REFERENCES Meal(meal_id) ON DELETE CASCADE
);

DELIMITER $$

CREATE TRIGGER trg_calculate_wastage
AFTER INSERT ON Food_Consumed
FOR EACH ROW
BEGIN
    DECLARE prepared DECIMAL(8,2);

    SELECT quantity_prepared_kg INTO prepared
    FROM Food_Prepared
    WHERE meal_id = NEW.meal_id
    LIMIT 1;

    IF prepared IS NOT NULL THEN
        INSERT INTO Wastage_Log (meal_id, wastage_kg)
        VALUES (
            NEW.meal_id,
            GREATEST(prepared - NEW.quantity_consumed_kg, 0)
        );
    END IF;
END$$

DELIMITER ;

DELIMITER //

CREATE PROCEDURE GetAutoPredictions()
BEGIN
    SELECT
        m.meal_type,
        ROUND(AVG(a.students_present), 0)         AS predicted_students,
        ROUND(AVG(a.students_present) * 0.6, 2)   AS standard_estimate_kg,
        ROUND(AVG(fc.quantity_consumed_kg), 2)     AS historical_avg_kg,
        ROUND(AVG(wl.wastage_kg), 2)               AS avg_wastage_kg,
        ROUND(
            ((AVG(a.students_present) * 0.6) * 0.5
            + AVG(fc.quantity_consumed_kg) * 0.5)
            * 1.102
        , 2) AS suggested_quantity_kg
    FROM Meal m
    JOIN Attendance a     ON m.meal_id = a.meal_id
    JOIN Food_Consumed fc ON m.meal_id = fc.meal_id
    JOIN Wastage_Log wl   ON m.meal_id = wl.meal_id
    GROUP BY m.meal_type
    ORDER BY m.meal_type;
END //

DELIMITER ;

-- 🔹 Dashboard main table
CREATE VIEW vw_meal_summary AS
SELECT 
    m.meal_id,
    m.meal_date,
    m.meal_type,
    COALESCE(a.students_present, 0) AS students_present,
    COALESCE(fp.quantity_prepared_kg, 0) AS prepared_kg,
    COALESCE(fc.quantity_consumed_kg, 0) AS consumed_kg,
    COALESCE(wl.wastage_kg, 0) AS wastage_kg,
    CASE 
        WHEN fp.quantity_prepared_kg > 0 
        THEN ROUND((wl.wastage_kg / fp.quantity_prepared_kg) * 100, 2)
        ELSE 0 
    END AS wastage_percent
FROM Meal m
LEFT JOIN Attendance a ON m.meal_id = a.meal_id
LEFT JOIN Food_Prepared fp ON m.meal_id = fp.meal_id
LEFT JOIN Food_Consumed fc ON m.meal_id = fc.meal_id
LEFT JOIN Wastage_Log wl ON m.meal_id = wl.meal_id;

-- 🔹 Wastage summary
CREATE VIEW vw_wastage_by_type AS
SELECT 
    m.meal_type,
    COUNT(m.meal_id) AS total_meals,
    ROUND(AVG(COALESCE(w.wastage_kg,0)),2) AS avg_wastage,
    ROUND(SUM(COALESCE(w.wastage_kg,0)),2) AS total_wastage
FROM Meal m
LEFT JOIN Wastage_Log w ON m.meal_id = w.meal_id
GROUP BY m.meal_type;


INSERT INTO Meal (meal_date, meal_type) VALUES
('2024-06-10','Breakfast'),
('2024-06-10','Lunch'),
('2024-06-10','Dinner');

INSERT INTO Attendance (meal_id, students_present) VALUES
(1,120),(2,95),(3,110);

INSERT INTO Food_Prepared (meal_id, quantity_prepared_kg, cost) VALUES
(1,60,500),(2,50,450),(3,55,480);

INSERT INTO Food_Consumed (meal_id, quantity_consumed_kg) VALUES
(1,48),(2,42),(3,50);
