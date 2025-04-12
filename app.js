const express = require("express");
const fs = require("fs");
const path = require("path");
const https = require("https");

const app = express();
const PORT = 8080;

const options = {
    key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'))
};

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// File penyimpanan rating
const ratingsFile = path.join(__dirname, "rate.json");

// Fungsi membaca rating dari file
function getRatings() {
    if (!fs.existsSync(ratingsFile)) return [];
    return JSON.parse(fs.readFileSync(ratingsFile, "utf8"));
}

// Fungsi menyimpan rating ke file
function saveRating(ip, rating, reason) {
    let ratings = getRatings();
    
    // Cek apakah IP sudah pernah merating
    if (ratings.some(entry => entry.ip === ip)) {
        return false;
    }

    // Simpan rating baru
    ratings.push({ ip, rating, reason });
    fs.writeFileSync(ratingsFile, JSON.stringify(ratings, null, 2));
    return true;
}

// Fungsi menghitung rata-rata rating
function getAverageRating() {
    let ratings = getRatings();
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, entry) => acc + entry.rating, 0);
    return (sum / ratings.length).toFixed(1);
}

// API untuk mendapatkan rata-rata rating
app.get("/get-rating", (req, res) => {
    res.json({ average: getAverageRating() });
});

// API untuk submit rating
app.post("/submit-rating", (req, res) => {
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const { rating, reason } = req.body;

    if (!rating || rating < 1 || rating > 10) {
        return res.json({ success: false, message: "Rating tidak valid!" });
    }

    if (saveRating(ip, rating, reason)) {
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Anda sudah memberikan rating!" });
    }
});

// Redirect root ke /panel/main
app.get("/", (req, res) => {
    res.redirect("/panel/main");
});

// Handler untuk menangani semua file dalam folder 'panel'
app.get("/panel/*", (req, res) => {
    const filePath = path.join(__dirname, req.path + ".html");
    const errorPath = path.join(__dirname, "error", "404.html");

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        console.warn(`⚠️ Halaman tidak ditemukan: ${req.path}`);
        if (fs.existsSync(errorPath)) {
            res.status(404).sendFile(errorPath);
        } else {
            res.status(404).send("404 - Not Found");
        }
    }
});

// Membuat server HTTPS dengan SSL
https.createServer(options, app).listen(PORT, () => {
    console.log(`✅ Server berjalan di https://localhost:${PORT}`);
});
