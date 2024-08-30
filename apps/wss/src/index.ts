require("dotenv").config();

import cors from "cors";
import WebSocket, { WebSocketServer } from "ws";
import express, { Request, Response } from "express";

const port = process.env.PORT;

let userId: number = 0;
let activeUsers: number = 0;

const app = express();

app.use(express.json());
app.use(cors());

const httpServer = app.listen(port, () => {
  console.log(
    `${new Date().toISOString()} - wss server is listening on port ${port}`
  );
});

httpServer.on("error", (error: Error) => {
  console.error(`${new Date().toISOString()} - Server error: ${error}`);
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws: WebSocket.WebSocket) => {
  userId++;
  activeUsers++;
  console.log(
    `${new Date().toISOString()} - New WebSocket connection established. User id: ${userId}, Active users: ${activeUsers}`
  );

  ws.on("message", (data: WebSocket.Data, isBinary: boolean) => {
    console.log(`Received ${isBinary ? 'binary' : 'text'} message: ${data}`);
  
    wss.clients.forEach((client: WebSocket.WebSocket) => {
      if (client.readyState === WebSocket.OPEN && client !== ws) { // Exclude sending client
        client.send(data, { binary: isBinary });
      }
    });
  });

  ws.on("close", (code: number, reason: Buffer) => {
    activeUsers--;
    console.log(
      `${new Date().toISOString()} - WebSocket Closed: code=${code}, reason=${reason}, Active users: ${activeUsers}`
    );
  });

  ws.on("error", (error: Error) => {
    console.error(`${new Date().toISOString()} - WebSocket error: ${error.message}`);
  });
});
