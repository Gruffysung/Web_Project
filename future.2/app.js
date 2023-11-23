const express = require("express");
const cors = require("cors");
const port = 3000;
const path = require("path");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const bcrypt = require("bcrypt");
const myPlaintextPassword = 's0/\/\P4$$w0rD'
const saltRounds = 10;
const dbConnection = require("./db");
const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "/views/mainpage", "login.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "/views/mainpage", "register.html"));
});

app.get("/main", async (req, res) => {
    try {
        dbConnection.query(
            "SELECT motorcycle_id, motorcycle_name, motorcycle_image FROM motorcycles",
            (err, result, fields) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send();
                }
                res.status(200).json(result);
                // const filePath = path.join(__dirname, "/views/mainpage", "main.html");
                // res.sendFile(filePath);
            }
        );
    } catch (err) {
        console.log(err);
        return res.status(500).send();
    }
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await new Promise((resolve, reject) => {
            dbConnection.query(
                "SELECT * FROM users WHERE email = ?",
                [email],
                (err, result, fields) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result.length > 0 ? result[0] : null);
                    }
                }
            );
        });

        if (user) {
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (passwordMatch) {
                const token = jwt.sign({ email, urole: user.urole }, "MEPEEn", {
                    expiresIn: "1h",
                });

                // ตรวจสอบ urole เพื่อเปลี่ยนเส้นทาง
                switch (user.urole) {
                    case "staff":
                        return res.redirect("/views/staff/homestaff.html");
                    case "lender":
                        return res.redirect("/views/lender/listlender.html");
                    case "user":
                        return res.redirect("/views/users/home.html");
                    default:
                        return res.status(200).json({ token, urole: user.urole });
                }
            } else {
                return res.status(401).json({ error: "Invalid email or password" });
            }
        } else {
            return res.status(401).json({ error: "Invalid email or password" });
        }
    } catch (err) {
        console.log("Server error during login", err);
        return res.status(500).send();
    }
});

// Register
app.post('/register', jsonParser, async (req, res) => {
    const {
        firstname,
        lastname,
        username,
        email,
        password,
        phone,
        address,
        gender,
    } = req.body;

    try {
        // Hash the password using bcrypt
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert user into the database
        dbConnection.query(
            'INSERT INTO users(firstname, lastname, username, email, password, phone, address, gender, urole) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                firstname,
                lastname,
                username,
                email,
                hashedPassword, // ใช้พาสเวิร์ดที่ถูกแฮชแล้ว
                phone,
                address,
                gender,
                'user',
            ],
            (err, result) => {
                if (err) {
                    console.error('Error inserting user:', err);
                    res.status(500).json({ error: 'Internal Server Error' });
                    return;
                }
                res.status(201).json({ message: 'User registered successfully!', userId: result.insertId });
            }
        );
    } catch (err) {
        console.error('Error hashing password:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get("/profile/:email", async (req, res) => {
    const email = req.params.email;

    try {
        dbConnection.query(
            "SELECT username, email, image, phone, address  FROM users WHERE email = ?",
            [email],
            (err, result, fields) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send();
                }
                res
                    .status(200)
                    .sendFile(path.join(__dirname, "/views/users", "profile.html"));
                // res.status(200).json(result);
            }
        );
    } catch (err) {
        console.log(err);
        return res.status(500).send();
    }
});

app.patch("/profile/:email", async (req, res) => {
    const email = req.params.email;
    const newpassword = req.body.password;
    const image = req.body.image;

    try {
        dbConnection.query(
            "UPDATE users SET password = ?, image = ? WHERE email = ?",
            [newpassword, image, email],
            (err, result, fields) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send();
                }
                res.status(200).json({ message: "Password changed successfully!" });
            }
        );
    } catch (err) {
        console.log("Password changed failed");
        return res.status(500).send();
    }
});

app.get("/home", async (req, res) => {
    try {
        dbConnection.query(
            "SELECT motorcycle_id, motorcycle_name, motorcycle_image, motorcycle_status FROM motorcycles",
            (err, result, fields) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send();
                }
                const filePath = path.join(__dirname, "/views/users", "home.html");
                res.sendFile(filePath);
            }
        );
    } catch (err) {
        console.log(err);
        return res.status(500).send();
    }
});

app.get("/confirm/:motorcycle_id", async (req, res) => {
    const motorcycle_id = req.params.motorcycle_id;
    try {
        dbConnection.query(
            "SELECT  motorcycle_id, motorcycle_image FROM motorcycles WHERE motorcycle_id = ?",
            [motorcycle_id],
            (err, result, fields) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send();
                }
                const filePath = path.join(__dirname, "/views/users", "confirm.html");
                res.sendFile(filePath);
            }
        );
    } catch (err) {
        console.log(err);
        return res.status(500).send();
    }
});

app.patch("/confirm/:motorcycle_id", async (req, res) => {
    const {
        borrow_address,
        borrow_date,
        borrow_time,
        return_address,
        return_date,
        return_time,
        motorcycle_status,
        user_process,
    } = req.body;
    const motorcycle_id = req.params.motorcycle_id;

    try {
        dbConnection.query(
            "UPDATE borrowing, motorcycles SET borrow_address = ?, borrow_date = ?, borrow_time = ?, return_address = ?, return_date = ?, return_time = ?, motorcycles.motorcycle_status = ?, user_process = ? WHERE motorcycles.motorcycle_id = ?",
            [
                borrow_address,
                borrow_date,
                borrow_time,
                return_address,
                return_date,
                return_time,
                motorcycle_status,
                user_process,
                motorcycle_id,
            ],
            (err, result, fields) => {
                if (err) {
                    console.log("Error update into 'borrowing'", err);
                    return res.status(400).json({ message: "Disapprove" });
                }

                return res.status(200).json({ message: "Complete!" });
            }
        );
    } catch (err) {
        console.log("Server error during registration", err);
        return res.status(500).send();
    }
});

app.get("/detail/:motorcycle_id", async (req, res) => {
    const motorcycle_id = req.params.motorcycle_id;
    try {
        dbConnection.query(
            "SELECT motorcycle_id, motorcycle_name, motorcycle_image, motorcycle_detail, motorcycle_insurance, motorcycle_traffic FROM motorcycles WHERE motorcycle_id = ?",
            [motorcycle_id],
            (err, result, fields) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send();
                }
                // res.status(200).json(result);
                const filePath = path.join(__dirname, "/views/users", "detail.html");
                res.sendFile(filePath);
            }
        );
    } catch (err) {
        console.log(err);
        return res.status(500).send();
    }
});

app.get("/list/:user_id", async (req, res) => {
    const user_id = req.params.user_id;
    try {
        dbConnection.query(
            "SELECT request_date, motorcycle_id, motorcycle_name, user_process, borrow_date, return_date, borrow_location, return_location, motorcycle_status FROM borrowing WHERE user_id = ?",
            [user_id],
            (err, result, fields) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send();
                }
                // res.status(200).json(result);
                res
                    .status(200)
                    .sendFile(path.join(__dirname, "/views/users", "list.html"));
            }
        );
    } catch (err) {
        console.log(err);
        return res.status(500).send();
    }
});

app.get("/history/:user_id", async (req, res) => {
    const user_id = req.params.user_id;
    try {
        dbConnection.query(
            "SELECT accept_date, user_process, motorcycle_id, motorcycle_name, lender_status, borrow_location, return_location, approve_by, reason FROM borrowing WHERE user_id =?",
            [user_id],
            (err, result, fields) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send();
                }
                // res.status(200).json(result);
                res
                    .status(200)
                    .sendFile(path.join(__dirname, "/views/users", "history.html"));
            }
        );
    } catch (err) {
        console.log(err);
        return res.status(500).send();
    }
});

// app.get("/dashboard_lander/:email", async (req, res) => {
//     const email = req.params.email;
//     try {
//         dbConnection.query(
//             "SELECT borrowing.user_id, motorcycles.motorcycle_id FROM  borrowing, motorcycles, users WHERE email = ?",
//             [email],
//             (err, result, fields) => {
//                 if (err) {
//                     console.log(err);
//                     return res.status(400).send();
//                 }
//                 // res.status(200).json({ result });
//                 res
//                     .status(200)
//                     .sendFile(
//                         path.join(__dirname, "/views/dashboard-history", "dashboard.html")
//                     );
//             }
//         );
//     } catch (err) {
//         console.log(err);
//         return res.status(500).send();
//     }
// });

app.get("/listlender/:email", async (req, res) => {
    const email = req.params.email;
    try {
        dbConnection.query(
            "SELECT request_date, user_profile, borrowing.image, motorcycle_id, motorcycle_name, user_process, borrow_date, return_date, borrow_location, return_location, motorcycle_status lender_status FROM borrowing, users  WHERE email = ?",
            [email],
            (err, result, fields) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send();
                }
                // res.status(200).json(result);
                res
                    .status(200)
                    .sendFile(path.join(__dirname, "/views/lender", "listlender.html"));
            }
        );
    } catch (err) {
        console.log(err);
        return res.status(500).send();
    }
});

app.patch("/listlender/:email", async (req, res) => {
    const email = req.params.email;
    const {
        approve_by,
        reason,
        lender_status,
        motorcycle_status,
        user_process,
        borrow_location,
        borrow_date,
        return_location,
        return_date,
        borrow_time,
        return_time,
        accept_date,
    } = req.body;

    try {
        dbConnection.query(
            "UPDATE borrowing, users SET approve_by = ?, reason = ?, lender_status = ?, motorcycle_status = ?, user_process = ?, borrow_location = ?, borrow_date = ?, return_location = ?, return_date = ?, borrow_time = ?, return_time = ?, accept_date = ? WHERE email = ?",
            [
                approve_by,
                reason,
                lender_status,
                motorcycle_status,
                user_process,
                borrow_location,
                borrow_date,
                return_location,
                return_date,
                borrow_time,
                return_time,
                accept_date,
                email,
            ],
            (err, result, fields) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send();
                }
                res
                    .status(200)
                    .json({ message: "Status update successfully!", result });
            }
        );
    } catch (err) {
        console.log("Status update failed");
        return res.status(500).send();
    }
});

app.get("/history", async (req, res) => {
    try {
        dbConnection.query(
            "SELECT id, accept_date, user_process, motorcycle_id, motorcycle_name,lender_status, borrow_location, return_location, approve_by, reason FROM borrowing ",
            (err, result, fields) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send();
                }
                // res.status(200).json(result);
                res
                    .status(200)
                    .sendFile(
                        path.join(__dirname, "/views/dashboard-history", "history.html")
                    );
            }
        );
    } catch (err) {
        console.log(err);
        return res.status(500).send();
    }
});


app.get("/homestaff/:email", async (req, res) => {
    const email = req.params.email;
    try {
        dbConnection.query(
            "SELECT motorcycle_name, motorcycle_status, motorcycle_id, motorcycle_image FROM  motorcycles, users WHERE email = ?",
            [email],
            (err, result, fields) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send();
                }
                // res.status(200).json(result);
                res.status(200).sendFile(path.join(__dirname, "/views/staff", "homestaff.html"));
            }
        );
    } catch (err) {
        console.log(err);
        return res.status(500).send();
    }
});


app.delete("/homestaff/:email", async (req, res) => {
    const email = req.params.email;

    try {
        dbConnection.query(
            "DELETE FROM motorcycle WHERE email = ?",
            [email],
            (err, result, fields) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send();

                }
                return res.status(200).json({ message: "Product deleted successfully!" });
            }
        );
    } catch (err) {
        console.log(err);
        return res.status(500).send();
    }
});


app.get("/Staff_edit/:email/:motorcycle_id", async (req, res) => {
    const email = req.params.email;
    const motorcycle_id = req.params.motorcycle_id;
    try {
        dbConnection.query(
            "SELECT motorcycle_name, motorcycle_status, motorcycle_id, motorcycle_image, motorcycle_detail, motorcycle_traffic, motorcycle_insurance FROM motorcycles JOIN users WHERE users.email = ? AND motorcycles.motorcycle_id = ?",
            [email, motorcycle_id],
            (err, result, fields) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send();
                }
                // res.status(200).json(result);
                res.status(200).sendFile(path.join(__dirname, "/views/staff", "edit.html"));
            }
        );
    } catch (err) {
        console.log(err);
        return res.status(500).send();
    }
});


app.patch("/Staff_edit/:email", async (req, res) => {
    const email = req.params.email;
    const { motorcycle_image, motorcycle_name, motorcycle_id, motorcycle_status, motorcycle_detail, motorcycle_traffic, motorcycle_insurance } = req.body;

    try {
        dbConnection.query(
            "UPDATE motorcycles, users SET motorcycle_image = ?, motorcycle_name = ?, motorcycle_id = ?, motorcycle_status = ?, motorcycle_detail = ?, motorcycle_traffic = ?, motorcycle_insurance = ?   WHERE email = ?",
            [motorcycle_image, motorcycle_name, motorcycle_id, motorcycle_status, motorcycle_detail, motorcycle_traffic, motorcycle_insurance, email],
            (err, result, fields) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send();
                }
                res.status(200).json({ message: "Product update successfully!" });
            }
        );
    } catch (err) {
        console.log("Product update failed");
        return res.status(500).send();
    }
});



app.post("/detailstaff/:email", async (req, res) => {
    const { motorcycle_name, motorcycle_detail, motorcycle_image, motorcycle_status, motorcycle_insurance, motorcycle_traffic } = req.body;
    const email = req.params.email;
    try {
        // Insert into 'borrowing'
        dbConnection.query(
            "INSERT INTO motorcycles (motorcycle_name, motorcycle_detail, motorcycle_image, motorcycle_status, motorcycle_insurance, motorcycle_traffic) VALUES (?, ?, ?, ?, ?, ?)",
            [
                motorcycle_name, motorcycle_detail, motorcycle_image, motorcycle_status, motorcycle_insurance, motorcycle_traffic, email
            ],
            (err, result, fields) => {
                if (err) {
                    console.log("Error inserting into 'borrowing'", err);
                    return res.status(400).json({ message: "Post product fialed" });
                }

                return res.status(200).json({ message: "Post product successfully!" });
            }
        );
    } catch (err) {
        console.log("Server error during registration", err);
        return res.status(500).send();
    }
});

// app.get("/dashboard_staff/:email", async (req, res) => {
//     const email = req.params.email;
//     try {
//         dbConnection.query(
//             "SELECT borrowing.user_id, motorcycles.motorcycle_id FROM  borrowing, motorcycles, users WHERE email = ?",
//             [email],
//             (err, result, fields) => {
//                 if (err) {
//                     console.log(err);
//                     return res.status(400).send();
//                 }
//                 // res.status(200).json({ result });
//                 res
//                     .status(200)
//                     .sendFile(
//                         path.join(__dirname, "/views/dashboard-history", "dashboard.html")
//                     );
//             }
//         );
//     } catch (err) {
//         console.log(err);
//         return res.status(500).send();
//     }
// });





app.get("/", (req, res) => res.sendFile(path.join(__dirname, "/views/mainpage", "main.html")));
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
