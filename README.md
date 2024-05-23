# MathanGo task

User Management and Email Sending API

### Features
- List Creation: Create lists with a title and custom properties.
- User Addition via CSV: Add users to a list by uploading a CSV file.
- Email Sending: Send customized emails to users on a list (bonus feature).
- Unsubscribe: Allow users to unsubscribe from email lists (bonus feature).

## RUNNING THE SERVER


1. Clone the repository:

```CMD
git clone https://github.com/AVtheking/MathanGo_task
```
To run the server, you need to have NodeJS installed on your machine. If you don't have it installed, you can follow the instructions [here](https://nodejs.org/en//) to install it.



2. Install the dependencies: 

```CMD
npm install
```


4. Setup .env file in base directory:

```
MONGO_URL=" "
PORT=5000
EMAIL=" "
PASSWORD=" "
BASE_URL=" "

```


5. Run the backend server on localhost:

```CMD
node index.js
```

