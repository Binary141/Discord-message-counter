require("dotenv").config(); //to start process from .env file
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});
let userList = {}
let jokesList = {}

async function fetchAllMessages() {
  // From https://stackoverflow.com/questions/63322284/discord-js-get-an-array-of-all-messages-in-a-channel
  const channel = client.channels.cache.get(process.env.CHANNEL_ID);
  var messages = [];

  // Create message pointer
  let message = await channel.messages
    .fetch({ limit: 1 })
    .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

  while (message) {
    await channel.messages
      .fetch({ limit: 100, before: message.id })
      .then(messagePage => {
        messagePage.forEach(msg => {
          messages.push(msg)
        });

        // Update our message pointer to be last message in page of messages
        message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
      })
      }
  for (let i = messages.length - 1; i >= 0; i-- ){
    if (/^[a-zA-Z0-9].*\? I barely know her!/.test(messages[i].content) && jokesList[messages[i].content.toLowerCase()] == undefined ) {
      // if the message is a joke, add it to the dictionary and assign the user that
      // originally sent that message as the value for a quicker value
      jokesList[messages[i].content.toLowerCase()] = messages[i].author.username

      if (userList[messages[i].author.username] == undefined) {
        userList[messages[i].author.username] = 1
      } else {
        userList[messages[i].author.username] += 1
      }
    }
  }
  console.log(userList)
  console.log(jokesList)
}

client.once("ready", () =>{
  console.log("BOT IS ONLINE"); //message when bot is online
  client.user.setPresence({ activities: [{ name: 'Your mom ;)' }], status: 'online' });
  fetchAllMessages()
})

client.on("messageCreate", function (message) {
  console.log("Message: ", message.content);
  if (message.author.username === client.user.username) {
    // if we sent the message, don't respond to it
    return
  }
  if (message.content.substring(0, 1) === "!") {
    //reply if message has "!" as first character
    if (message.content.substring(1, 6) === "count") {
      // send the counts for all users that we know of
      let response = "Here are the counts!\n"
      for (const key in userList) {
        response += `${key}: ${userList[key]}\n`;
      }
      message.channel.send(response);
    }
  } else {
    try {
      if (/^[a-zA-Z0-9].*\? I barely know her!/.test(message) ||
          /^[a-zA-Z0-9].*\? I hardly know her!/.test(message)) {
        // if it is in the correct format, respond and increment the count
        if (jokesList[message.content.toLowerCase()] == undefined ) {
          // if we haven't seen this joke before, do the work
          jokesList[message.content.toLowerCase()] = message.author.username
          message.channel.send("Good one " + message.author.username + "!");

          if (userList[message.author.username] == undefined) {
            // if the user doesn't exist, assign them a count of 1
            userList[message.author.username] = 1
          } else {
            userList[message.author.username] += 1
          }
        } else {
          message.channel.send(`I can't believe you would copy ${jokesList[message.content.toLowerCase()]}'s joke like that! For shame -_-`);
        }
      }
    } catch (error){
      console.log(error)
    }
  }
})

client.login(process.env.TOKEN);
