DROP DATABASE IF EXISTS foodwise_db;
CREATE DATABASE foodwise_db;
USE foodwise_db;

-- ─── CORE TABLES (1:1 per Meal enforced) ───

CREATE TABLE Meal (
    meal_id    INT AUTO_INCREMENT PRIMARY KEY,
    meal_date  DATE NOT NULL,
    meal_type  ENUM('Breakfast','Lunch','Dinner') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_meal_date_type (meal_date, meal_type)
);

CREATE TABLE Attendance (
    attendance_id    INT AUTO_INCREMENT PRIMARY KEY,
    meal_id          INT NOT NULL,
    students_present INT NOT NULL CHECK (students_present >= 0),
    UNIQUE KEY uq_attendance_meal (meal_id),
    FOREIGN KEY (meal_id) REFERENCES Meal(meal_id) ON DELETE CASCADE
);

CREATE TABLE Food_Prepared (
    prepared_id          INT AUTO_INCREMENT PRIMARY KEY,
    meal_id              INT NOT NULL,
    quantity_prepared_kg DECIMAL(8,2) NOT NULL CHECK (quantity_prepared_kg > 0),
    UNIQUE KEY uq_prepared_meal (meal_id),
    FOREIGN KEY (meal_id) REFERENCES Meal(meal_id) ON DELETE CASCADE
);

CREATE TABLE Food_Consumed (
    consumed_id          INT AUTO_INCREMENT PRIMARY KEY,
    meal_id              INT NOT NULL,
    quantity_consumed_kg DECIMAL(8,2) NOT NULL CHECK (quantity_consumed_kg >= 0),
    UNIQUE KEY uq_consumed_meal (meal_id),
    FOREIGN KEY (meal_id) REFERENCES Meal(meal_id) ON DELETE CASCADE
);

CREATE TABLE Wastage_Log (
    wastage_id    INT AUTO_INCREMENT PRIMARY KEY,
    meal_id       INT NOT NULL,
    wastage_kg    DECIMAL(8,2) NOT NULL CHECK (wastage_kg >= 0),
    recorded_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_wastage_meal (meal_id),
    FOREIGN KEY (meal_id) REFERENCES Meal(meal_id) ON DELETE CASCADE
);

CREATE TABLE Prediction (
    prediction_id         INT AUTO_INCREMENT PRIMARY KEY,
    prediction_date       DATE NOT NULL,
    meal_type             ENUM('Breakfast','Lunch','Dinner') NOT NULL,
    predicted_students    INT NOT NULL CHECK (predicted_students >= 0),
    standard_estimate_kg  DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (standard_estimate_kg >= 0),
    historical_avg_kg     DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (historical_avg_kg >= 0),
    suggested_quantity_kg DECIMAL(8,2) NOT NULL CHECK (suggested_quantity_kg >= 0),
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Audit_Log (
    audit_id   INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(64) NOT NULL,
    action     ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    record_id  INT NOT NULL,
    changed_by VARCHAR(100) NOT NULL DEFAULT 'system',
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── WASTAGE AUTO-CALCULATION TRIGGERS ───

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
        VALUES (NEW.meal_id, GREATEST(prepared - NEW.quantity_consumed_kg, 0))
        ON DUPLICATE KEY UPDATE
            wastage_kg    = VALUES(wastage_kg),
            recorded_time = CURRENT_TIMESTAMP;
    END IF;
END$$

CREATE TRIGGER trg_recalc_wastage_consumed_upd
AFTER UPDATE ON Food_Consumed
FOR EACH ROW
BEGIN
    DECLARE prepared DECIMAL(8,2);

    SELECT quantity_prepared_kg INTO prepared
    FROM Food_Prepared
    WHERE meal_id = NEW.meal_id
    LIMIT 1;

    IF prepared IS NOT NULL THEN
        INSERT INTO Wastage_Log (meal_id, wastage_kg)
        VALUES (NEW.meal_id, GREATEST(prepared - NEW.quantity_consumed_kg, 0))
        ON DUPLICATE KEY UPDATE
            wastage_kg    = VALUES(wastage_kg),
            recorded_time = CURRENT_TIMESTAMP;
    END IF;
END$$

CREATE TRIGGER trg_recalc_wastage_prepared_ins
AFTER INSERT ON Food_Prepared
FOR EACH ROW
BEGIN
    DECLARE consumed DECIMAL(8,2);

    SELECT quantity_consumed_kg INTO consumed
    FROM Food_Consumed
    WHERE meal_id = NEW.meal_id
    LIMIT 1;

    IF consumed IS NOT NULL THEN
        INSERT INTO Wastage_Log (meal_id, wastage_kg)
        VALUES (NEW.meal_id, GREATEST(NEW.quantity_prepared_kg - consumed, 0))
        ON DUPLICATE KEY UPDATE
            wastage_kg    = VALUES(wastage_kg),
            recorded_time = CURRENT_TIMESTAMP;
    END IF;
END$$

CREATE TRIGGER trg_recalc_wastage_prepared_upd
AFTER UPDATE ON Food_Prepared
FOR EACH ROW
BEGIN
    DECLARE consumed DECIMAL(8,2);

    SELECT quantity_consumed_kg INTO consumed
    FROM Food_Consumed
    WHERE meal_id = NEW.meal_id
    LIMIT 1;

    IF consumed IS NOT NULL THEN
        INSERT INTO Wastage_Log (meal_id, wastage_kg)
        VALUES (NEW.meal_id, GREATEST(NEW.quantity_prepared_kg - consumed, 0))
        ON DUPLICATE KEY UPDATE
            wastage_kg    = VALUES(wastage_kg),
            recorded_time = CURRENT_TIMESTAMP;
    END IF;
END$$

-- ─── AUDIT TRIGGERS ───

CREATE TRIGGER trg_audit_meal_ins AFTER INSERT ON Meal FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Meal', 'INSERT', NEW.meal_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_meal_upd AFTER UPDATE ON Meal FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Meal', 'UPDATE', NEW.meal_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_meal_del AFTER DELETE ON Meal FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Meal', 'DELETE', OLD.meal_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_attendance_ins AFTER INSERT ON Attendance FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Attendance', 'INSERT', NEW.attendance_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_attendance_upd AFTER UPDATE ON Attendance FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Attendance', 'UPDATE', NEW.attendance_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_attendance_del AFTER DELETE ON Attendance FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Attendance', 'DELETE', OLD.attendance_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_prepared_ins AFTER INSERT ON Food_Prepared FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Food_Prepared', 'INSERT', NEW.prepared_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_prepared_upd AFTER UPDATE ON Food_Prepared FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Food_Prepared', 'UPDATE', NEW.prepared_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_prepared_del AFTER DELETE ON Food_Prepared FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Food_Prepared', 'DELETE', OLD.prepared_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_consumed_ins AFTER INSERT ON Food_Consumed FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Food_Consumed', 'INSERT', NEW.consumed_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_consumed_upd AFTER UPDATE ON Food_Consumed FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Food_Consumed', 'UPDATE', NEW.consumed_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_consumed_del AFTER DELETE ON Food_Consumed FOR EACH ROW
BEGIN
    DELETE FROM Wastage_Log WHERE meal_id = OLD.meal_id;
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Food_Consumed', 'DELETE', OLD.consumed_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_wastage_ins AFTER INSERT ON Wastage_Log FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Wastage_Log', 'INSERT', NEW.wastage_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_wastage_upd AFTER UPDATE ON Wastage_Log FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Wastage_Log', 'UPDATE', NEW.wastage_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_wastage_del AFTER DELETE ON Wastage_Log FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Wastage_Log', 'DELETE', OLD.wastage_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_prediction_ins AFTER INSERT ON Prediction FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Prediction', 'INSERT', NEW.prediction_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_prediction_upd AFTER UPDATE ON Prediction FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Prediction', 'UPDATE', NEW.prediction_id, CURRENT_USER());
END$$

CREATE TRIGGER trg_audit_prediction_del AFTER DELETE ON Prediction FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action, record_id, changed_by)
    VALUES ('Prediction', 'DELETE', OLD.prediction_id, CURRENT_USER());
END$$

DELIMITER ;

-- ─── VIEWS ───

CREATE VIEW vw_meal_summary AS
SELECT
    m.meal_id,
    m.meal_date,
    m.meal_type,
    COALESCE(a.students_present, 0)      AS students_present,
    COALESCE(fp.quantity_prepared_kg, 0) AS prepared_kg,
    COALESCE(fc.quantity_consumed_kg, 0) AS consumed_kg,
    COALESCE(wl.wastage_kg, 0)           AS wastage_kg,
    CASE
        WHEN fp.quantity_prepared_kg > 0 AND wl.wastage_kg IS NOT NULL
        THEN ROUND((wl.wastage_kg / fp.quantity_prepared_kg) * 100, 2)
        ELSE 0
    END AS wastage_percent
FROM Meal m
LEFT JOIN Attendance a     ON m.meal_id = a.meal_id
LEFT JOIN Food_Prepared fp ON m.meal_id = fp.meal_id
LEFT JOIN Food_Consumed fc ON m.meal_id = fc.meal_id
LEFT JOIN Wastage_Log wl   ON m.meal_id = wl.meal_id;

CREATE VIEW vw_wastage_by_type AS
SELECT
    meal_type,
    COUNT(meal_id)                 AS total_meals,
    ROUND(AVG(wastage_kg), 2)      AS avg_wastage_kg,
    ROUND(SUM(wastage_kg), 2)      AS total_wasted_kg,
    ROUND(MAX(wastage_kg), 2)      AS max_wastage_kg,
    ROUND(AVG(students_present), 0) AS avg_students
FROM vw_meal_summary
GROUP BY meal_type;

CREATE VIEW vw_daily_trend AS
SELECT
    m.meal_date,
    ROUND(SUM(COALESCE(wl.wastage_kg, 0)), 2) AS total_wastage_kg
FROM Meal m
LEFT JOIN Wastage_Log wl ON m.meal_id = wl.meal_id
GROUP BY m.meal_date
ORDER BY m.meal_date ASC;

-- ─── STORED PROCEDURES ───

DELIMITER //

CREATE PROCEDURE GetAutoPredictions()
BEGIN
    SELECT
        m.meal_type,
        ROUND(AVG(a.students_present), 0)               AS predicted_students,
        ROUND(AVG(a.students_present) * 0.6, 2)         AS standard_estimate_kg,
        ROUND(AVG(fc.quantity_consumed_kg), 2)          AS historical_avg_kg,
        ROUND(COALESCE(AVG(wl.wastage_kg), 0), 2)       AS avg_wastage_kg,
        ROUND(
            ((AVG(a.students_present) * 0.6) * 0.5
            + AVG(fc.quantity_consumed_kg) * 0.5)
            * 1.10
        , 2) AS suggested_quantity_kg
    FROM Meal m
    JOIN Attendance a       ON m.meal_id = a.meal_id
    JOIN Food_Consumed fc   ON m.meal_id = fc.meal_id
    LEFT JOIN Wastage_Log wl ON m.meal_id = wl.meal_id
    GROUP BY m.meal_type
    ORDER BY m.meal_type;
END //

CREATE PROCEDURE sp_wastage_report(
    IN p_start_date DATE,
    IN p_end_date   DATE,
    IN p_hostel_id  INT
)
BEGIN
    -- p_hostel_id is reserved for future multi-hostel filtering
    SELECT
        meal_id,
        DATE_FORMAT(meal_date, '%Y-%m-%d') AS meal_date,
        meal_type,
        students_present,
        prepared_kg,
        consumed_kg,
        wastage_kg,
        wastage_percent
    FROM vw_meal_summary
    WHERE meal_date BETWEEN p_start_date AND p_end_date
      AND (p_hostel_id IS NULL OR p_hostel_id >= 0)
    ORDER BY meal_date DESC, meal_id DESC;

    SELECT
        meal_type,
        COUNT(*)                         AS total_meals,
        ROUND(SUM(prepared_kg), 2)       AS total_prepared_kg,
        ROUND(SUM(consumed_kg), 2)       AS total_consumed_kg,
        ROUND(SUM(wastage_kg), 2)        AS total_wasted_kg,
        ROUND(AVG(wastage_kg), 2)        AS avg_wastage_kg
    FROM vw_meal_summary
    WHERE meal_date BETWEEN p_start_date AND p_end_date
      AND (p_hostel_id IS NULL OR p_hostel_id >= 0)
    GROUP BY meal_type
    ORDER BY meal_type;
END //

DELIMITER ;

-- ─── SEED DATA ───

INSERT INTO Meal (meal_date, meal_type) VALUES
('2024-06-10', 'Breakfast'),
('2024-06-10', 'Lunch'),
('2024-06-10', 'Dinner');

INSERT INTO Attendance (meal_id, students_present) VALUES
(1, 120),
(2, 95),
(3, 110);

INSERT INTO Food_Prepared (meal_id, quantity_prepared_kg) VALUES
(1, 60.00),
(2, 50.00),
(3, 55.00);

INSERT INTO Food_Consumed (meal_id, quantity_consumed_kg) VALUES
(1, 48.00),
(2, 42.00),
(3, 50.00);
