let mysql = require('mysql');
var SqlString = require('sqlstring');
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
let connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'discord'
});

connection.connect(function(err) {
  if (err) {
    connection.query("create database if not exists discord", function(err, result) {
      if (err) throw err;
    });
    connection.query("create table if not exists jokes (user varchar(255), joke varchar(255))", function(err, result) {
      if (err) throw err;
    });
    connection.query("create table if not exists users (user varchar(255), count varchar(255))", function(err, result) {
      if (err) throw err;
    });
      return console.error('error: ' + err.message);
  }

  connection.query("create database if not exists discord", function(err, result) {
  if (err) throw err;
  });
  connection.query("create table if not exists jokes (user varchar(255), joke varchar(255))", function(err, result) {
    if (err) throw err;
  });
  connection.query("create table if not exists users (user varchar(255), count varchar(255))", function(err, result) {
    if (err) throw err;
  });

  console.log('Connected to the MySQL server.');
});

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

function isValid(str){
    if(typeof(str)!=='string'){
        return false;
    }
    for(var i=0;i<str.length;i++){
        if(str.charCodeAt(i)>127){
            return false;
        }
    }
    return true;
}

async function doesNotExist(joke) {
  return new Promise( (resolve, reject) => {
    connection.query(`select * from jokes where joke = ${SqlString.escape(joke)}`, function(err, result) {
      if (err) throw err;
      resolve(result.length == 0)
    });
  });
}

async function fetchAllMessages() {
  const channel = client.channels.cache.get(process.env.CHANNEL_ID);
  var messages = [];

  // Create message pointer
  let message
  if (process.env.LASTMSG == undefined || process.env.LASTMSG == 0) {
    message = await channel.messages
      .fetch({ limit: 1 })
      .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));
  } else {
    await channel.messages
      .fetch(process.env.LASTMSG)
      .then(messageThing => {
        message = messageThing
      });
  }

  try {
    while (message) {
      await channel.messages
        .fetch({ limit: 100, before: message.id })
        .then(messagePage => {
          messagePage.forEach(msg => {
            if (msg.author.username === client.user.username) {
              // if we sent the message, don't respond to it
            } else {
              let username = msg.author.username
              let joke = msg.content.toLowerCase().split("?")[0]
              if (isValid(joke) && checkRegex(msg.content)) {
                doesNotExist(joke).then(notExists => {
                  if (notExists) {
                    checkRealWord(msg.content).then(function (data) {
                      if (data) {
                        connection.query(`insert into jokes (user, joke) values (${SqlString.escape(username)}, ${SqlString.escape(joke)})`, function(err, result) {
                          if (err) throw err;
                    });
                      }
                    })
                  }
                })
              }
            }
         })
          // Update our message pointer to be last message in page of messages
          message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
         })
      console.log(message.id)
      }
  } catch (error) {
    console.log(error)
    console.log("Uh oh, that be an error")
  }
  console.log(userList)
  console.log(jokesList)
}

client.once("ready", () => {
  console.log("BOT IS ONLINE"); //message when bot is online
  client.user.setPresence({ activities: [{ name: process.env.ACTIVITIES }], status: process.env.STATUS });
  // fetchAllMessages()
})

client.on("messageCreate", async function(message) {
  if (message.author.username === client.user.username) {
    // if we sent the message, don't respond to it
    return
  }

  if (message.content.substring(0, 6) === "!count") {
    //reply if message has "!" as first character
    let response = "Here are the counts!\n"
    connection.query(`select user, count(1) as "count" from jokes group by user`, function(err, result) {
      if (err) throw err;
      for (let i = 0; i < result.length; i++) {
        console.log(result[i])
        response += `${result[i].user}: ${result[i].count}\n`;
      }
      message.channel.send(response);
  });
  } else if (message.content.substring(0, 7) === "!recall") {
    let response = ""
    let username = ""

    let splitMsg = message.content.split(" ")
    for (let i = 1; i < splitMsg.length; i++) {
      username = username.concat(splitMsg[i], " ")
    }

    username = username.trim()
    for (const key in jokesList) {
      if (jokesList[key] == username) {
        response += `${key}\n`;
      }
    }
    if (response.length == 0) {
      message.channel.send(`Can't find messages from ${username} :/`);
    } else {
      message.channel.send(`Heres what I have for ${username}!\n${response}`);
    }

  } else{
    try {
      if (checkRegex(message.content)) {
        // if it is in the correct format, respond and increment the count
        let joke = message.content.toLowerCase().split("?")[0]
        if (jokesList[joke] == undefined) {
          // if we haven't seen this joke before, do the work
          await checkRealWord(message.content).then(function (isWord) {
            if (isWord) {
              // if the message is a joke, add it to the dictionary and assign the user that
              // originally sent that message as the value for a quicker value
              jokesList[joke] = message.author.username
              userList[message.author.username] = userList[message.author.username] ? userList[message.author.username] + 1 : 1
              message.channel.send("Good one " + message.author.username + "!");
            } else {
              message.channel.send(`Bruh. This is not a word -_-`);
            }
          })
        } else {
          if (jokesList[joke] != message.author.username) {
            message.channel.send(`I can't believe you would copy ${jokesList[joke]}'s joke like that! For shame -_-`);
          } else {
            message.channel.send(`I can't believe you would try and reuse your own joke! Much sadness -_-`);
          }
        }
      }
    } catch (error) {
      console.log(error)
    }
  }
})

client.login(process.env.TOKEN);
