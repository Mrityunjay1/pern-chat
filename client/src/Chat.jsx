import { useContext, useEffect, useRef, useState } from "react";
// import Avatar from "./components/Avatar";
import { UserContext } from "./UserContext";
import { uniqBy } from "lodash";
import axios from "axios";
import PersoList from "./components/PersoList";

const Chat = () => {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [selectedUserId, setSelectedUserID] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [offlinePeople, setOfflinePeople] = useState({});
  const [typingUser, setTypingUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { username, setId, setUsername, id } = useContext(UserContext);
  const messageBoxRef = useRef(null);
  useEffect(() => {
    connectToWebsocket();
  }, []);

  function connectToWebsocket() {
    const wss = new WebSocket("ws://localhost:4000");

    // Save the WebSocket instance in state
    setWs(wss);

    // Handle incoming messages
    wss.addEventListener("message", handleMessage);

    // Handle the WebSocket close event and try to reconnect
    wss.addEventListener("close", () => {
      console.log("Disconnected, trying to reconnect in 1 second...");

      setTimeout(() => {
        connectToWebsocket();
      }, 1000); // Wait 1 second before attempting to reconnect
    });
  }

  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach(({ userId, username }) => {
      people[userId] = username;
    });
    setOnlinePeople(people);
  }

  function handleMessage(e) {
    const messageData = JSON.parse(e.data);
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      setMessages((prev) => [...prev, { ...messageData }]);
    } else if (messageData.typing) {
      setTypingUser(messageData.sender);
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000); // Hide typing indicator after 3 seconds
    }
  }
  const onlinePeopleExOurUserc = { ...onlinePeople };
  delete onlinePeopleExOurUserc[id];

  function selectContact(userId) {
    setSelectedUserID(userId);
  }

  function sendMessage(e, file = null) {
    if (e) e.preventDefault();

    ws.send(
      JSON.stringify({
        recipient: selectedUserId,
        text: newMessage,
        file,
      })
    );
    setNewMessage("");
    setMessages((prev) => [
      ...prev,
      {
        text: newMessage,
        isOur: true,
        sender: id,
        recipient: selectedUserId,
        id: Date.now(),
      },
    ]);
    if (file) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    }
  }

  useEffect(() => {
    if (selectedUserId) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    }
  }, [selectedUserId]);

  useEffect(() => {
    const div = messageBoxRef.current;
    if (div) {
      div.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  useEffect(() => {
    axios.get("/people").then((res) => {
      const offlinePeople = res.data
        .filter((p) => p.id !== id)
        .filter((p) => !Object.keys(onlinePeople).includes(p.id));
      const offlinePeopleObj = {};
      offlinePeople.forEach((p) => {
        offlinePeopleObj[p.id] = p;
      });
      setOfflinePeople(offlinePeopleObj);
    });
  }, [onlinePeople]);

  const messageWithoutDupes = uniqBy(messages, "id");

  function logout() {
    axios.post("/logout").then(() => {
      setWs(null);
      setId(null), setUsername(null);
    });
  }

  function sendFile(e) {
    const reader = new FileReader();
    reader.readAsDataURL(e.target.files[0]);
    reader.onload = () => {
      sendMessage(null, {
        name: e.target.files[0].name,
        data: reader.result,
      });
    };
  }

  function handleTyping(e) {
    e.preventDefault();
    ws.send(
      JSON.stringify({
        typing: true,
        recipient: selectedUserId,
      })
    );
  }

  const filteredOnlinePeople = Object.keys(onlinePeopleExOurUserc).filter(
    (userId) =>
      onlinePeople[userId].toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredOfflinePeople = Object.keys(offlinePeople).filter((userId) =>
    offlinePeople[userId].username
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const selectedContact =
    onlinePeople[selectedUserId] || offlinePeople[selectedUserId] || {};

  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/4 mt-6 flex flex-col h-full relative">
        <div className="flex-grow overflow-y-auto">
          <div className="text-red-500 text-3xl flex gap-2 mb-4 items-center justify-center font-bold">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
              />
            </svg>
            My Chat
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="p-2 w-full border-b"
          />
          {filteredOnlinePeople.map((userId) => (
            <PersoList
              key={userId}
              username={onlinePeople[userId] || ""}
              id={userId}
              onlinePeople={onlinePeople[userId] ? onlinePeople[userId][0] : ""}
              selectedUserId={selectedUserId}
              onClick={() => selectContact(userId)}
              online={true}
            />
          ))}
          {filteredOfflinePeople.map((userId) => (
            <PersoList
              key={userId}
              username={offlinePeople[userId]?.username || ""}
              id={userId}
              onlinePeople={offlinePeople[userId]?.username[0] || ""}
              selectedUserId={selectedUserId}
              onClick={() => selectContact(userId)}
              online={false}
            />
          ))}
        </div>
        <div className="p-2 text-center flex items-center justify-between absolute bottom-0 left-0 right-0 bg-white border-t">
          <span className="mr-2 text-sm text-gray-400 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-6 w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                clipRule="evenodd"
              />
            </svg>
            {username}
          </span>
          <button
            onClick={logout}
            className="text-sm text-gray-600 bg-red-100 py-1 px-2 border rounded-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="bg-slate-50 flex flex-col w-3/4 p-2">
        {selectedUserId && (
          <div className="bg-gray-50 p-4 flex items-center border-b">
            {/* Avatar or Initials */}
            <div className="w-12 h-12 flex items-center justify-center bg-red-300 rounded-full text-white font-bold">
              {selectedContact.username
                ? selectedContact.username[0].toUpperCase()
                : selectedContact[0].toUpperCase()}
            </div>
            <div className="ml-4">
              <div className="text-xl font-bold">
                {selectedContact.username
                  ? selectedContact.username[0].toUpperCase() +
                    selectedContact.username.slice(1)
                  : selectedContact[0].toUpperCase() + selectedContact.slice(1)}
              </div>
              {isTyping && typingUser === selectedUserId && (
                <div className="text-sm text-gray-500">Typing...</div>
              )}
            </div>
          </div>
        )}

        <div className="flex-grow">
          {!selectedUserId && (
            <div className="flex h-full items-center justify-center">
              <div className="font-3xl text-lg">No Messages Found</div>
            </div>
          )}
          {!!selectedUserId && (
            <div className="relative h-full">
              <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                {messageWithoutDupes.map((message) => {
                  return (
                    <div
                      key={message.id}
                      className={
                        message.sender === id ? "text-right" : "text-left"
                      }
                    >
                      <div
                        className={`text-left inline-block p-2 my-2 rounded-md text-sm ${
                          message.sender === id
                            ? "bg-red-300 text-white"
                            : "bg-white text-black"
                        }  `}
                      >
                        {message.text}
                        {message.filePath && (
                          <div>
                            <img
                              src={`${axios.defaults.baseURL}/uploads/${message.filePath}`}
                              alt="Image"
                              className="w-48 h-auto"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messageBoxRef}></div>
              </div>
            </div>
          )}
        </div>
        {selectedUserId && (
          <form className="flex gap-2 mx-2" onSubmit={sendMessage}>
            <input
              type="text"
              className="bg-white flex-grow border p-4 rounded-sm"
              placeholder="Enter Your Message"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping(e);
              }}
            />
            <label
              type="button"
              className="bg-red-400 p-2 absolute cursor-pointer right-20 border-red-700 bottom-4 text-white rounded-sm"
              onChange={sendFile}
            >
              <input type="file" className="hidden" />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-6"
              >
                <path
                  fillRule="evenodd"
                  d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z"
                  clipRule="evenodd"
                />
              </svg>
            </label>
            <button
              type="submit"
              className="bg-red-400 p-2 absolute right-8 bottom-4 text-white rounded-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
export default Chat;
