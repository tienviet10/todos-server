
<h1 align="center">
  <br>
  <a href="http://remeapp.netlify.app"><img src="https://user-images.githubusercontent.com/70352144/191369786-648bd405-70c2-47ca-bc43-529ae7bb7b62.png" alt="ReMe" width="200"></a>
  <br>
  RemindMe Express REST API
  <br>
  <div align="center">
    <a href="https://github.com/tienviet10/todos-server/actions/workflows/main.yml"><img src="https://github.com/tienviet10/todos-server/actions/workflows/main.yml/badge.svg" alt="Deployment Badge" ></a>
  </div>  
</h1>

<h4 align="center">This backend application is written in Node.js (<a href="https://expressjs.com/">Express.js</a>) and deployed automatically to <a href="https://fly.io/">fly.io</a> on merges to master via GitHub Actions. The frontend made in React.js can be accessed at this <a href="https://github.com/tienviet10/todos-client/">link.</a></h4>

<p align="center">
  <a href="#key-features">Tech Stack & Features</a> •
  <a href="#running-locally">Running Locally</a> •
  <a href="#deployment-process">Deployment Process</a> •
  <a href="#todo">TODO</a>
</p>



## Tech Stack & Features

* Automatically restarting Node application when there are file changes using [Nodemon](https://nodemon.io)
* Securely transmitting information between parties with [JSON Web Token](https://github.com/auth0/node-jsonwebtoken#readme)
* Setting secure HTTP headers using [Helmet](https://helmetjs.github.io)
* Google Calendar integration through [googleapis](https://github.com/googleapis/google-api-nodejs-client#readme)
* Automatically load environment variables from a .env file into the process using [dotenv](https://github.com/motdotla/dotenv#readme)
 
## Running Locally

**Prerequisites**

The following applications should be installed in your system:
* [Git](https://git-scm.com) 
* [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com))
* MongoDB account
* Google Cloud console for Google Calendar Integration

**API**

1. Create a folder and clone this repository

```sh
$ git clone https://github.com/tienviet10/todos-server.git
```

2. Move to the correct directory

```sh
$ cd todos-server
```

3. Install dependencies

```sh
$ npm install
```

4. Fill out variables in .env file. The JWT_SECRET, JWT_ACCOUNT_ACTIVATION, and JWT_RESET_PASSWORD variables can be any random string. For DATABASE_CLOUD, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET variables, please see the instructions below to get the connection strings for MongoDB and Google Cloud console.

5. Run the application

```sh
$ npm run dev
```

The API will run locally at: http://localhost:8000/

**Database**

Set up a [MongoDB](https://www.mongodb.com) account:
1. Sign up for an account
2. In Quickstart, create a user with a password
3. Add Your Current IP Address to IP Access List
4. Go to your Database, create a cluster or choose a cluster to be connected. Press "Connect" button and get the connection string. This connection string should be added to .env file with the variable named DATABASE_CLOUD


**Google Calendar Integration**

1. Sign up and log into [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project
3. Create Credentials for OAuth 2.0 Client IDs. Copy the Client ID and the Client secret to GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET variables in .env file.

## Deployment Process

CI/CD using GitHub Actions.

## TODO

* Support Google Calendar integration for shared reminders
* Support roles in shared reminders
