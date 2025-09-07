import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.0/firebase-app.js";
import { getDatabase, ref, onValue, child, push, update, get, set} from "https://www.gstatic.com/firebasejs/12.2.0/firebase-database.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCTUg9DqZDx6em5Uw3RwFCURlpI_g1UmpE",
  authDomain: "test-3ffed.firebaseapp.com",
  databaseURL: "https://test-3ffed-default-rtdb.firebaseio.com",
  projectId: "test-3ffed",
  storageBucket: "test-3ffed.firebasestorage.app",
  messagingSenderId: "1017713734087",
  appId: "1:1017713734087:web:4f006f1dcc1976663269e2",
  measurementId: "G-S3QLWG6FD4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const dbRef = ref(database);

let username = "";
let isSignup = false;
let channelListener;

const loginScreen = document.getElementById("loginScreen");
const loginTitle = document.getElementById("loginTitle");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const toggleAuth = document.getElementById("toggleAuth");
const sidebar = document.getElementById("sidebar");
const chat = document.getElementById("chat");

const renameModal = document.getElementById("renameModal");
const renameInput = document.getElementById("renameInput");
const renameCancel = document.getElementById("renameCancel");
const renameSave = document.getElementById("renameSave");

toggleAuth.onclick = () => {
    isSignup = !isSignup;
    if (isSignup) {
    loginTitle.textContent = "Sign Up";
    loginBtn.textContent = "Sign Up";
    toggleAuth.textContent = "Already have an account? Login";
    } else {
    loginTitle.textContent = "Login";
    loginBtn.textContent = "Login";
    toggleAuth.textContent = "Don't have an account? Sign up";
    }
};

loginBtn.onclick = async () => {
    username = loginUsername.value.trim();
    let password = loginPassword.value.trim();
    if (!username || !password) {
        alert("Please enter username and password");
        return;
    }

    let users = {};
    await get(child(dbRef, "Users")).then((snapshot) => {
        users = snapshot.val()
    })

    if (isSignup) {
        if (username in users) {
            alert("Username already taken!");
            return;
        }

        const updates = {}
        updates["Users/" + username] = {Password: password, Channels: {"1": true, "2": true}};
        updates["Channels/1/Members/" + username] = true;
        updates["Channels/2/Members/" + username] = true;
        update(dbRef, updates)
    } else {
        if (!(username in users)) {
            alert("Username not found!");
            return;
        }

        if (users[username].Password !== password) {
            alert("Incorrect password! - " + users[username].password);
            return;
        }
    }
    loginScreen.classList.add("hidden");
    sidebar.classList.remove("hidden");
    chat.classList.remove("hidden");
    await getChannels();
    renderChannels();
    renderMessages();
};

const channelListEl = document.getElementById("channelList");
const messagesEl = document.getElementById("messages");
const chatHeader = document.getElementById("chatHeader");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const addChannelBtn = document.getElementById("addChannel");
const channels = {};
/*
const channels = {
    "0": {
        Name: "General",
        Owner: "System",
        Members: {
            System: true
        },
        Messages: [
            { Sender: "System", Message: "Welcome!"},
        ]
    },
    "1": {
        Name: "Random",
        Owner: "System",
        Members: {
            System: true
        },
        Messages: [
            { Sender: "System", Message: "Random thoughts go here."},
        ]
    }
};*/
let currentChannel = "0";

async function getChannels() {
    let channelNames = {}
    let messages = {}

    // Get channels
    await get(child(dbRef, "Channels")).then((snapshot) => {
        if (!snapshot.exists()) {
            console.log("No channel data found");
            return;   
        }

        channelNames = Object.fromEntries(Object.entries(snapshot.val()).filter(([channelId, channel]) => channel.Members?.[username]));

    }).catch((error) => {
        console.error(error);
    })

    // Get messages
    await get(child(dbRef, "Messages")).then((snapshot) => {
        if (snapshot.exists()) {
            messages = snapshot.val();
        } else {
            console.log("No message data found");
        }
    }).catch((error) => {
        console.error(error);
    })

    for (let channelID in channelNames) {
        let channelName = channelNames[channelID].Name;
        let channelMembers = channelNames[channelID].Members;
        let channelOwner = channelNames[channelID].Owner;
        let channelMessages = Object.values(messages[channelID]).slice(1);
        let channel = {
            Name: channelName,
            Members: channelMembers,
            Owner: channelOwner,
            Messages: channelMessages
        }
        channels[channelID] = channel;
    }
    currentChannel = Object.keys(channelNames)[0];
}

function renderChannels() {
    channelListEl.innerHTML = "";
    for (let id in channels) {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.textContent = "#" + channels[id].Name;
        
        
        if (id === currentChannel) btn.classList.add("active");
        btn.onclick = () => {
            channelListener();
            currentChannel = id;
            chatHeader.textContent = "#" + channels[id].Name;
            // If owner, make it look clickable
            if (channels[currentChannel].Owner === username) {
                chatHeader.style.cursor = "pointer";
                chatHeader.title = "Click to rename channel";
            } else {
                chatHeader.style.cursor = "default";
                chatHeader.removeAttribute("title");
            }
            renderChannels();
            renderMessages();
        };
        li.appendChild(btn);
        channelListEl.appendChild(li);
    };

    channelListener = onValue(ref(database, `Messages/${currentChannel}`), async (snapshot) => {
        await get(child(dbRef, "Messages")).then((snapshot) => {
            let messages = snapshot.val();
            channels[currentChannel].Messages = Object.values(messages[currentChannel]).slice(1);
        })
        renderMessages();
    });
}

function renderMessages() {
    messagesEl.innerHTML = "";
    const msgs = channels[currentChannel].Messages || [];
    let prevAuthor = null;
    msgs.forEach((m) => {
        const div = document.createElement("div");
        div.className = "message " + (m.Sender === username ? "mine" : "theirs");
        if (m.Sender !== prevAuthor) {
            const author = document.createElement("div");
            author.className = "author";
            author.textContent = m.Sender;
            div.appendChild(author);
        }
        
        const bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.textContent = m.Message;
        div.appendChild(bubble);
        messagesEl.appendChild(div);
        prevAuthor = m.Sender;
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;
    const messageData = { Sender: username, Message: text };
    channels[currentChannel].Messages.push(messageData);
    
    const updates = {};
    const messageKey = push(child(dbRef, `Messages/${currentChannel}`)).key;
    updates["Messages/" + currentChannel + "/" + messageKey] = messageData;

    update(dbRef, updates);

    renderMessages();
    inputEl.value = "";
}

onValue(ref(database, `Users/${username}/Channels`), (snapshot) => {
    getChannels();
    renderChannels();
});

sendBtn.onclick = sendMessage;
inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

addChannelBtn.onclick = () => {
    let name = "newchannel" + Math.floor(Math.random() * 10000);
    let newChannel = { Members: {}, Name: name, Owner: username }
    newChannel.Members[username] = true;

    const updates = {};
    const channelKey = push(child(dbRef, "Channels")).key;
    updates[`Channels/${channelKey}`] = newChannel;
    updates[`Users/${username}/Channels/${channelKey}`] = true;
    updates[`Messages/${channelKey}`] = {"0": {Message: "Init", Sender: "System"}};
    update(dbRef, updates);

    channels[channelKey] = newChannel;
    currentChannel = channelKey;
    chatHeader.textContent = "#" + name;
    renderChannels();
    renderMessages();
};

// Open modal when clicking chat header
chatHeader.onclick = () => {
  if (channels[currentChannel].Owner !== username) {
    console.log("Owner: " + channels[currentChannel].Owner);
    console.log("Username: " + username);
    return; // Not the owner, do nothing
  }

  renameInput.value = channels[currentChannel].Name;
  renameModal.classList.remove("hidden");
  renameInput.focus();
};

// Cancel button
renameCancel.onclick = () => {
  renameModal.classList.add("hidden");
};

// Save new channel name
renameSave.onclick = async () => {
  const newName = renameInput.value.trim();
  if (!newName) return;

  // Update Firebase
  const updates = {};
  updates[`Channels/${currentChannel}/Name`] = newName;
  await update(dbRef, updates);

  // Update local state
  channels[currentChannel].Name = newName;
  chatHeader.textContent = "#" + newName;
  renderChannels();

  // Close modal
  renameModal.classList.add("hidden");
};

