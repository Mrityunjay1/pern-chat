# PERN Chat

This a multi tenant chat app where users can chat with each other. \

#

## Features

    1. Real-time messaging between users
    2. Online/offline status for users
    3. “Typing…” indicator while chatting
    4. Read/unread message sorting system
    5. Image upload feature
    6. Infinite scrolling of messages to the top

## Run Locally

Clone the project

```bash
  git clone https://github.com/Mrityunjay1/pern-chat
```

Go to the project directory

```bash
  cd pern-chat
```

Install dependencies

```bash
  yarn i
```

Start the server

```bash
  yarn dev for client
  nodemon index.js
```

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file in server folder

`DB_HOST`

`DB_USERNAME`

`DB_PASSWORD`

`DATABASE`

`DB_PORT`

## Tech Stack

**Client:** React, Context, TailwindCSS

**Server:** Node, Express, Postgres, websockets
