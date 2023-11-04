const {Schema, model} = require('mongoose');
const chatBot = new Schema({
  userToken: {
    type: String,
    required: true
  },
  messages: [
    {
      from: {
        type: String,
        required: true
      },
      message: {
        type: String,
        required: true
      },
      time: {
        type: String,
        required: true
      }
    }
  ]
});

const chatData = model("chat_data", chatBot);
module.exports = chatData;