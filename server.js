const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ---------------- USERS FILE SETUP ----------------
const usersFile = path.join(__dirname, "users.json");

// Ensure users.json exists BEFORE routes
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([]));
}

// Safe file read function
function readUsers() {
    try {
        return JSON.parse(fs.readFileSync(usersFile));
    } catch (err) {
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// ---------------- REGISTER API ----------------
app.post("/register", async (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
    }

    const users = readUsers();

    const userExists = users.find(u => u.username === username);

    if (userExists) {
        return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    users.push({ username, password: hashedPassword });

    saveUsers(users);

    res.json({ message: "User registered successfully" });
});

// ---------------- LOGIN API ----------------
app.post("/login", async (req, res) => {

    const { username, password } = req.body;

    const users = readUsers();

    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({ message: "Login successful" });
});

// ---------------- UPLOAD FOLDER SETUP ----------------
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use("/uploads", express.static(uploadDir));

// ---------------- UPLOAD IMAGE ----------------
app.post("/upload", (req, res) => {

    const { image, lotId } = req.body;

    if (!image || !lotId) {
        return res.status(400).json({ message: "Image or Lot ID missing" });
    }

    const matches = image.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);

    if (!matches) {
        return res.status(400).json({ message: "Invalid image format" });
    }

    const extension = matches[1] === "jpeg" ? "jpg" : matches[1];
    const base64Data = matches[2];

    const fileName = `${lotId}_${Date.now()}.${extension}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFile(filePath, base64Data, "base64", (err) => {
        if (err) {
            return res.status(500).json({ message: "Error saving image" });
        }

        res.json({
            message: "Scan saved successfully",
            fileName,
            url: `http://localhost:${PORT}/uploads/${fileName}`
        });
    });
});

// ---------------- GET HISTORY ----------------
app.get("/history", (req, res) => {

    fs.readdir(uploadDir, (err, files) => {

        if (err) {
            return res.status(500).json({ message: "Error reading uploads" });
        }

        const images = files
            .filter(file => file.endsWith(".png") || file.endsWith(".jpg"))
            .map(file => {
                const stats = fs.statSync(path.join(uploadDir, file));
                return {
                    fileName: file,
                    url: `http://localhost:${PORT}/uploads/${file}`,
                    createdAt: stats.birthtime
                };
            })
            .sort((a, b) => b.createdAt - a.createdAt);

        res.json(images);
    });
});

// ---------------- DELETE IMAGE ----------------
app.delete("/delete/:fileName", (req, res) => {

    const filePath = path.join(uploadDir, req.params.fileName);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
    }

    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).json({ message: "Error deleting file" });
        }

        res.json({ message: "File deleted successfully" });
    });
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});