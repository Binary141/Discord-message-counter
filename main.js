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

function checkRegex(input) {
  var re = new RegExp(process.env.REGEX)
  return re.test(input)
}

async function checkRealWord(message) {
  return new Promise( (resolve, reject) => {
      let word = message.split("?")[0];
      fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`).then(function(response){
        response.json().then(function (data) {
          resolve(data.title != "No Definitions Found");
        });
      });
  });
}

async function fetchAllMessages() {
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
  for (let i = messages.length - 1; i >= 0; i--) {

    if (checkRegex(messages[i].content) &&
      jokesList[messages[i].content.toLowerCase()] == undefined ) {
      await checkRealWord(messages[i].content).then(function (data) {
        if (data) {
          // if the message is a joke, add it to the dictionary and assign the user that
          // originally sent that message as the value for a quicker value
          jokesList[messages[i].content.toLowerCase()] = messages[i].author.username

          userList[messages[i].author.username] = userList[messages[i].author.username] ? userList[messages[i].author.username] + 1 : 1

        }
      })

    }
  }
  console.log(userList)
  console.log(jokesList)
}

client.once("ready", () => {
  console.log("BOT IS ONLINE"); //message when bot is online
  client.user.setPresence({ activities: [{ name: process.env.ACTIVITIES }], status: process.env.STATUS });
  fetchAllMessages()
})

client.on("messageCreate", async function(message) {
  if (message.author.username === client.user.username) {
    // if we sent the message, don't respond to it
    return
  }
  if (message.content.substring(0, 6) === "!count") {
    //reply if message has "!" as first character
    let response = "Here are the counts!\n"
    for (const key in userList) {
      response += `${key}: ${userList[key]}\n`;
    }
    message.channel.send(response);
  } else {
    try {
      if (checkRegex(message.content)) {
        // if it is in the correct format, respond and increment the count
        if (jokesList[message.content.toLowerCase()] == undefined) {
          // if we haven't seen this joke before, do the work
          await checkRealWord(message.content).then(function (isWord) {
            if (isWord) {
              // if the message is a joke, add it to the dictionary and assign the user that
              // originally sent that message as the value for a quicker value
              jokesList[message.content.toLowerCase()] = message.author.username
              userList[message.author.username] = userList[message.author.username] ? userList[message.author.username] + 1 : 1
              message.channel.send("Good one " + message.author.username + "!");
            } else {
              message.channel.send(`Bruh. This is not a word -_-`);
            }
          })
        } else {
          message.channel.send(`I can't believe you would copy ${jokesList[message.content.toLowerCase()]}'s joke like that! For shame -_-`);
        }
      }
    } catch (error) {
      console.log(error)
    }
  }
})

client.login(process.env.TOKEN);
