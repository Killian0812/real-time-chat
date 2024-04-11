const bcrypt = require('bcrypt');

const User = require('../models/user.model');
const Room = require('../models/room.model');
const Entry = require('../models/entry.model');
const PendingRequest = require('../models/pendingRequest.model');
const { io, getDeviceSocketId } = require('../socket');

async function handleGetUserInfo(req, res) {
    console.log("Someone getting info");
    var user = await User.findOne({ username: req.params.username });
    user.password = null;
    return res.status(200).json(user);
}

async function handleUpdateExpoPushToken(req, res) {
    console.log("Someone updating expo push token");
    var user = await User.findOne({ username: req.params.username });
    user.expoPushToken = req.body.expoPushToken;
    await user.save();
    return res.status(200).json("OK");
}

async function handleGetRooms(req, res) {
    console.log("Quering rooms");
    const user = await User.findOne({ username: req.query.username });
    const query = { _id: { $in: user?.room } };
    const rooms = await Room.find(query);
    // console.log(rooms);
    return res.status(200).json(rooms);
}

async function handleGetRoomDetails(req, res) {
    console.log("Quering room detail with id:" + req.query.id);
    const room = await Room.findOne({ _id: req.query.id });
    console.log(room);
    return res.status(200).json(room);
}

async function handleGetRoomEntries(req, res) {
    console.log("Quering room entries with mac address: " + req.query.mac);
    const entries = await Entry.find({ mac: req.query.mac });
    // console.log(entries);
    return res.status(200).json(entries);
}

async function handleGetPendingRequests(req, res) {
    console.log("Quering pending request");
    const user = await User.findOne({ username: req.query.username });
    const roomIds = user.room;
    // replace ref with actual room object 
    PendingRequest.find({ room: { $in: roomIds } }).populate('room').then((pendingRequests) => {
        // console.log(pendingRequests);
        return res.status(200).json(pendingRequests);
    }).catch(() => {
        return res.sendStatus(500);
    })
}

async function handleApproveEntry(req, res) {
    const MAC = req.body.MAC;
    const status = req.body.status;
    const image = req.body.image;

    console.log(`${status}: ${MAC}`);

    // delete request in db
    PendingRequest.findByIdAndDelete(req.body.id)
        .then(() => console.log("Pending request successfully removed"))
        .catch((e) => console.log("Error removing pending request: ", e));

    // add entry to db
    const newEntry = new Entry({ mac: MAC, image: image });
    newEntry.save();

    // emit to AD socket here
    const socketId = getDeviceSocketId(MAC);
    if (socketId) {
        const sendToDevice = io.to(socketId).emit(status);
        if (sendToDevice)
            console.log(`Approval sent to device: ${MAC}`);
        else
            console.log(`Error sending approval to device: ${MAC}`)
        return res.sendStatus(200);
    }
    else {
        return res.sendStatus(200);
    }
}

async function handleUpdateUserInfo(req, res) {
    console.log("Someone updating info");
    var user = await User.findOne({ username: req.body.username });
    const newFullname = req.body.fullname;
    const newEmail = req.body.email;
    if (newFullname !== user.fullname || newEmail !== user.email) {
        user.fullname = newFullname;
        user.email = newEmail;
        await user.save();
    }
    return res.status(200).json("OK");
}

async function handleChangePassword(req, res) {
    console.log("Someone changing password");
    var user = await User.findOne({ username: req.body.username });
    const currentHashedPassword = user.password;
    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.newPassword;
    bcrypt.compare(currentPassword, currentHashedPassword, function (err, result) {
        if (err) {
            // console.log(err);
            return res.status(400).json("Wrong password");
        }
        else {
            if (currentPassword === newPassword)
                return res.status(409).json("Same password");
            else {
                bcrypt.genSalt(10, (err, salt) => {
                    if (err) {
                        return res.status(500).json("Error generating salt:" + err);
                    }

                    // Hash the password using the generated salt
                    bcrypt.hash(newPassword, salt, (err, newHashedPassword) => {
                        if (err) {
                            return res.status(500).json("Error hashing password: " + err);
                        }
                        else {
                            console.log('Hashed Password:', newHashedPassword);

                            user.password = newHashedPassword;
                            user.save()
                                .then(() => res.status(200).json("OK"))
                                .catch(err => res.status(400).json(err));
                        }
                    });
                });
            }
        }
    });
}

module.exports = {
    handleGetUserInfo, handleUpdateExpoPushToken,
    handleGetRooms, handleGetRoomDetails, handleGetRoomEntries,
    handleGetPendingRequests, handleApproveEntry,
    handleUpdateUserInfo, handleChangePassword
};