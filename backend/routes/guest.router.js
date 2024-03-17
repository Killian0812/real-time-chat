const router = require('express').Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const { v4: uuidv4 } = require('uuid');
const { FirebaseStorage } = require('../firebase/firebase');
const bucket = FirebaseStorage.bucket();
const User = require('../models/user.model');
const Room = require('../models/room.model');
const Entry = require('../models/entry.model');

const uploadToFirebaseStorage = async (file) => {
    var uuid = uuidv4();
    const remoteFile = bucket.file(uuid);
    await remoteFile.save(file.buffer, {
        contentType: file.mimetype,
        public: true,
    }).then(() => {
        console.log("File uploaded to Firebase successful");
    }).catch((err) => {
        console.log("Error uploading to Firebase: " + err);
        uuid = null;
    })
    return uuid;
}

router.post('/newEntry', upload.single('file'), async function (req, res) {
    const file = req.file;
    if (!file) {
        return res.status(400).send('No file uploaded.');
    }
    // console.log(file);
    const filename = await uploadToFirebaseStorage(file);
    console.log(filename);

    const newEntry = new Entry({ mac: req.body.mac, image: filename });
    newEntry.save().then(() => {
        return res.status(200).json("OK");
    }).catch((err) => {
        console.log(err);
        return res.status(500).json("FAILED");
    })
});

router.post('/newRoom', async function (req, res) {
    const user = await User.findOne({ username: "Killian0812" });
    const newRoom = new Room({ mac: "123abc", manager: [user._id] });
    newRoom.save().then(async (data) => {
        user.room = [...user.room, data._id];
        await user.save();
        console.log("New room added");
        return res.status(200).json("Success");
    }).catch(err => {
        console.log(err);
        return res.status(500);
    })
});

router.get('/rooms', async function (req, res) {
    console.log("Quering rooms");
    const user = await User.findOne({ username: req.query.username });
    const query = { _id: { $in: user?.room } };
    const rooms = await Room.find(query);
    // console.log(rooms);
    return res.status(200).json(rooms);
})

router.get('/roomDetails', async function (req, res) {
    console.log("Quering room detail with id:" + req.query.id);
    const room = await Room.findOne({ _id: req.query.id });
    console.log(room);
    return res.status(200).json(room);
})

router.get('/roomEntries', async function (req, res) {
    console.log("Quering room entries with mac address: " + req.query.mac);
    const entries = await Entry.find({ mac: req.query.mac });
    console.log(entries);
    return res.status(200).json(entries);
})

module.exports = router;