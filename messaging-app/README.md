# Messaging Application

## Overview
This messaging application allows users to create accounts, send friend requests, create groups, and share files and photos. It also includes voice chat capabilities and user profiles with badges. The application is designed to provide a seamless communication experience.

## Features
- **Account Creation**: Users can sign up using their email, username, and password.
- **Unique Usernames**: Each user must have a unique username.
- **Profile Photos**: Users can upload profile photos.
- **Friend Requests**: Users can send and manage friend requests.
- **Group Creation**: Users can create and manage groups.
- **File and Photo Sharing**: Users can share files and photos within chats and groups.
- **Voice Chat**: Users can engage in voice chat.
- **User Profiles**: Each user has a profile that displays their information and badges.
- **Admin Controls**: The founder, CaYatur, has special privileges to promote or demote users and manage bans.

## Founder Badge
The user named **CaYatur** is designated as the founder and will have a special badge indicating this status. This user has the ability to manage user roles and enforce bans on users who violate platform rules.

## Project Structure
```
messaging-app
├── server
│   ├── server.js
│   ├── routes
│   ├── middleware
│   ├── controllers
│   └── utils
├── data
│   ├── users
│   ├── groups
│   ├── messages
│   ├── uploads
│   └── logs
├── client
│   ├── index.html
│   ├── css
│   ├── js
│   └── assets
├── config
│   └── config.js
├── package.json
└── README.md
```

## Installation
1. Clone the repository.
2. Navigate to the project directory.
3. Run `npm install` to install dependencies.
4. Start the server with `node server/server.js`.

## Usage
- Access the client application through the browser.
- Create an account to start using the messaging features.
- Explore the functionalities such as sending messages, creating groups, and managing friends.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.