const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config({path: './config.env'});
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('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');
require('./utility/dbConnect');
const tokenModel = require('./utility/schema');

const app = express();

// init socket server
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());

// app homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// session post page
const { v4: uuidv4 } = require('uuid');
app.post('/session', (req, res) => {
  let data = {
    username: req.body.username,
    userID: uuidv4()
  }
  res.send(data);
});

// socket.io middleware
io.use((socket, next) => {
  const username = socket.handshake.auth.username;
  const userID = socket.handshake.auth.userID;
  if(!username) {
    return next(new Error('Invalid username'));
  }
  // create new session
  socket.username = username;
  socket.id = userID;
  next();
});

// socket events
let users = [];
io.on('connection', async socket => {

  // socket methods
  const methods = {
    getToken: (sender, receiver) => {
      let key = [sender, receiver].sort().join("_");
      return key;
    },
    fetchMessages: async (sender, receiver) => {
      let token = methods.getToken(sender, receiver);
      const findToken = await tokenModel.findOne({userToken: token});
      if(findToken) {
        io.to(sender).emit('stored-messages', {messages: findToken.messages});
      } else {
        let data = {
          userToken: token,
          messages: []
        }
        const saveToken = new tokenModel(data);
        const createToken = await saveToken.save();
        if(createToken) {
          console.log('Token created!');
        } else {
          console.log('Error in creating token');
        }
      }
    },
    saveMessages : async ({from, to, message, time}) => {
      let token = methods.getToken(from, to);
      let data = {
        from,
        message,
        time
      }
      tokenModel.updateOne({userToken: token}, {
        $push: {messages: data}
      }, (err, res) => {
        if (err) throw err;
        console.log('Message saved!', res);
      });
    }
    
  }

  // get all users
  let userData = {
    username : socket.username,
    userID : socket.id
  }
  users.push(userData);
  io.emit('users', {users});

  socket.on('disconnect', () => {
    users = users.filter( user => user.userID !== socket.id);
    io.emit('users', {users} );
    io.emit('user-away', socket.id);
  });

  // get message from client
  socket.on('message-to-server', payload => {
    io.to(payload.to).emit('message-to-user', payload);
    methods.saveMessages(payload);
  });

  // fetch previous messages
  socket.on('fetch-messages', ({receiver}) => {
    methods.fetchMessages(socket.id, receiver);
  });

});

app.get('/hello',(req,res)=>{
const recipients = ['divyachourasiya1007@gmail.com', 'd.chourasiya1007@gmail.com', 'divyachourasiya@infograins.com'];
const subject = 'Hello from SendGrid!';
const message = 'This is a test email sent from SendGrid using Node.js';

const msg = {
  to: 'divyachourasiya1007@gmail.com',
  from: 'd.chourasiya1007@gmail.com', // Replace with your email address
  subject: subject,
  text: message,
  html: `<p>${message}</p>`,
};

sgMail
  .send(msg)
  .then(() => {
    console.log('Email sent successfully');
  })
  .catch((error) => {
    console.error(error.toString());
  });
return res.send('ok')
})

const checkData = async(checkData)=>{
  
}

console.log();
server.listen(8001, () => {
  console.log(`Server is running on port 8001...`);
});