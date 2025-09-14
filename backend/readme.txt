db.messages.createIndex({ room_id: 1, timestamp: -1 })
db.rooms.createIndex({ room_id: 1 })
db.users.createIndex({ email: 1 }, { unique: true })
