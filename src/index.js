// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.0/firebase-app.js";
import { getDatabase, ref, set, onValue, child, push, update, get, increment} from "https://www.gstatic.com/firebasejs/12.2.0/firebase-database.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

/*
function writeData() {
    set(ref(database, "users"), {
        "Test": 2
    });
}

function updateData() {
    const dbRef = ref(database);
    const updates = {};
    updates['users/Test'] = increment(1);
    update(dbRef, updates)
}

onValue(ref(database, "users/Test"), (snapshot) => {
    const data = snapshot.val();
    console.log("Test changed, new value: " + data);
});*/


let username = "";
let isSignup = false;

const loginScreen = document.getElementById("loginScreen");
const loginTitle = document.getElementById("loginTitle");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const toggleAuth = document.getElementById("toggleAuth");
const sidebar = document.getElementById("sidebar");
const chat = document.getElementById("chat");

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
        Members: {
            System: true
        },
        Messages: [
            { Sender: "System", Message: "Welcome!"},
            { Sender: "Aayush", Message: "Hi!"}
        ]
    },
    "1": {
        Name: "Random",
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
        if (snapshot.exists()) {
            channelNames = snapshot.val();
        } else {
            console.log("No channel data found");
        }
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
        let channelMessages = Object.values(messages[channelID]);
        let channel = {
            Name: channelName,
            Members: channelMembers,
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
            currentChannel = id;
            chatHeader.textContent = "#" + channels[id].name;
            renderChannels();
            renderMessages();
        };
        li.appendChild(btn);
        channelListEl.appendChild(li);
    };
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

sendBtn.onclick = sendMessage;
inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

addChannelBtn.onclick = () => {
    let id = "newchannel" + Math.floor(Math.random() * 1000);
    channels[id] = [];
    currentChannel = id;
    chatHeader.textContent = "#" + id;
    renderChannels();
    renderMessages();
};
