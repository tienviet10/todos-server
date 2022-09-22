
<h1 align="center">
  <br>
  <a href="http://remeapp.netlify.app"><img src="https://user-images.githubusercontent.com/70352144/191369786-648bd405-70c2-47ca-bc43-529ae7bb7b62.png" alt="ReMe" width="200"></a>
  <br>
  RemindMe Express REST API
  <br>
</h1>

<h4 align="center">This backend application is written in Node.js (<a href="https://expressjs.com/">Express.js</a>) and deployed automatically to <a href="https://fly.io/">fly.io</a> on merges to master via GitHub Actions. The frontend made in React.js can be access at this <a href="https://github.com/tienviet10/todos-client">link.</a></h4>

<p align="center">
  <a href="#key-features">Tech Stack & Features</a> •
  <a href="#how-to-use">How To Use</a> •
  <a href="#deployment-process">Deployment Process</a> •
  <a href="#todo">TODO</a> •
</p>

<div align="center">
  <a href="https://github.com/tienviet10/todos-server/actions/workflows/main.yml"><img src="https://github.com/tienviet10/todos-server/actions/workflows/main.yml/badge.svg" alt="Deployment Badge" ></a>
</div>

## Tech Stack & Features

* Automatically restarting Node application when file changes using [Nodemon](https://nodemon.io)
* Securely transmitting information between parties with [JSON Web Token](https://github.com/auth0/node-jsonwebtoken#readme)
* Setting secured HTTP headers using [Helmet](https://helmetjs.github.io)
* Google Calendar integration through [googleapis](https://github.com/googleapis/google-api-nodejs-client#readme)
* Automatically load environment variables from a . env file into the process using [dotenv](https://github.com/motdotla/dotenv#readme)
 
## How To Use

To clone and run this application, you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:


## Deployment Process

CI/CD to be handled using GitHub actions.

## TODO

* Support Google Calendar integration for shared reminders
* Support roles in shared reminders
