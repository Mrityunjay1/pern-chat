import express from "express";
import db from "./database/db_connect.js";
import { messageSchema, userSchema } from "./database/schema.js";
import jwt from "jsonwebtoken";
import { v4 } from "uuid";
import { and, asc, desc, eq, or } from "drizzle-orm";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import ws from "ws";
import { WebSocketServer } from "ws";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173", // Specify the allowed origin
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  })
);
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));

const JWT_SECRET = "supersecretkey";
const bcryptSalt = bcrypt.genSaltSync(10);

async function getUserDataFnrquest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, JWT_SECRET, {}, (err, result) => {
        if (err) throw err;

        resolve(result);
      });
    } else {
      reject("No Token");
    }
  });
}

app.get("/", (req, res) => {
  res.json("test ok");
});

app.get("/messages/:userId", async (req, res) => {
  const { userId } = req.params;
  const userData = await getUserDataFnrquest(req);
  const myUserId = userData.userId;

  try {
    // Using Drizzle ORM to query the PostgreSQL database
    const messages = await db
      .select()
      .from(messageSchema)
      .where(
        and(
          or(
            eq(messageSchema.sender, userId),
            eq(messageSchema.sender, myUserId)
          ),
          or(
            eq(messageSchema.recipient, userId),
            eq(messageSchema.recipient, myUserId)
          )
        )
      )
      .orderBy(asc(messageSchema.createdAt));

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.get("/people", async (req, res) => {
  try {
    let user = await db
      .select({ id: userSchema.id, username: userSchema.username })
      .from(userSchema);
    res.json(user);
  } catch (error) {
    console.log(error);
  }
});

app.get("/profile", (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, JWT_SECRET, {}, (err, result) => {
      if (err) throw err;

      res.json(result);
    });
  } else {
    res.status(401).json("No Token");
  }
});

app.post("/register", async (req, res) => {
  let id = v4();

  try {
    // Insert the user into the database
    await db.insert(userSchema).values({
      id,
      username: req.body.username,
      password: bcrypt.hashSync(req.body.password, bcryptSalt),
      createdAt: new Date(),
    });

    // Retrieve the inserted user based on the ID
    let [user] = await db
      .select()
      .from(userSchema)
      .where(eq(userSchema.id, id));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a JWT token
    jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      (err, token) => {
        if (err) {
          throw err;
        }

        // Send the token as a cookie and return the user details
        res.cookie("token", token, { httpOnly: true }).status(201).json({
          id: user.id,
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Query the database to find the user by username
    let [user] = await db
      .select()
      .from(userSchema)
      .where(eq(userSchema.username, username));

    // Check if the user exists
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Generate a JWT token
    jwt.sign({ userId: user.id }, JWT_SECRET, (err, token) => {
      if (err) throw err;

      // Send the token as a cookie and return the user details
      res.cookie("token", token, { httpOnly: true }).status(200).json({
        id: user.id,
        username: user.username,
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});

app.post("/logout", (req, res) => {
  res.cookie("token", "", { httpOnly: true }).status(200).json("ok");
});

const server = app.listen(4000);

const wss = new WebSocketServer({ server });
wss.on("connection", (connection, req) => {
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith("token="));
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      if (token) {
        jwt.verify(token, JWT_SECRET, {}, (err, userData) => {
          if (err) throw err;
          const { userId, username } = userData;
          connection.userId = userId;
          connection.username = username;
        });
      }
    }
  }

  connection.on("message", async (message, isBinary) => {
    const id = v4();
    try {
      // Parse the incoming message
      message = JSON.parse(message.toString());

      // Destructure the recipient and text from the parsed message
      const { recipient, text, file, typing } = message;

      if (typing) {
        // Broadcast typing event to the recipient
        [...wss.clients]
          .filter((c) => c.userId === recipient)
          .forEach((c) =>
            c.send(
              JSON.stringify({
                typing: true,
                sender: connection.userId,
              })
            )
          );
        return;
      }

      let filePath = null;

      if (file) {
        const parts = file.name.split(".");
        const extension = parts[parts.length - 1];
        const filename = Date.now() + "." + extension;
        const uploadsDir = path.resolve(__dirname, "uploads");
        filePath = path.join(uploadsDir, filename);
        const bufferData = Buffer.from(file.data.split(",")[1], "base64");

        // Ensure the directory for storing files exists
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir);
        }

        // Save the file
        fs.writeFile(filePath, bufferData, (err) => {
          if (err) {
            console.error("Error saving file:", err);
            return;
          }
          console.log("File saved:", filePath);
        });

        // Update the filePath to be served statically
        filePath = `${filename}`;
      }

      // Ensure that both recipient and text are provided
      if (recipient && (text || filePath)) {
        // Insert the message into the database and return the inserted record with its ID
        const [insertedMessage] = await db
          .insert(messageSchema)
          .values({
            id,
            sender: connection.userId, // Sender is the userId associated with this WebSocket connection
            recipient: recipient, // Recipient is the ID of the target user
            text: text, // The message text
            filePath: filePath || null, // The file path if there is an uploaded file
            createdAt: new Date(), // The current timestamp
            updatedAt: new Date(), // The current timestamp
          })
          .returning(); // Return the inserted record including its ID

        // Send the message ID, text, and sender to the recipient(s)
        [...wss.clients]
          .filter((c) => c.userId === recipient) // Filter clients matching the recipient's userId
          .forEach((c) =>
            c.send(
              JSON.stringify({
                id: insertedMessage.id, // Include the ID of the inserted message
                text: insertedMessage.text,
                filePath: insertedMessage.filePath, // Include the file path if a file is attached
                sender: insertedMessage.sender,
                recipient: insertedMessage.recipient,
              })
            )
          );
      }
    } catch (error) {
      console.error("Failed to handle message:", error);
    }
  });

  [...wss.clients].forEach((client) => {
    client.send(
      JSON.stringify({
        online: [...wss.clients].map((c) => ({
          userId: c.userId,
          username: c.username,
        })),
      })
    );
  });
});
