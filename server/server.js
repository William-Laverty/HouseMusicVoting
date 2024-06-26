const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');
const https = require('https');
const fs = require('fs');

const app = express();
const port = 443;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.use(express.static(path.join(__dirname, '../public')));

// MongoDB connection URI
const uri = "mongodb+srv://wlaverty13:6clBU4IS6t7r9KK3@housemusic.xtse8op.mongodb.net/?retryWrites=true&w=majority&appName=HouseMusic";

// Connect to MongoDB Atlas
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");
    } catch (err) {
        console.error("Error connecting to MongoDB Atlas:", err);
    }
}
connectToMongoDB();

const dbName = 'HouseMusic';
const usersCollectionName = 'users';
const eventsCollectionName = 'events';
const currentEventCollectionName = 'currentEvent';
const pollOptionsCollectionName = 'pollOptions';

app.get('/current-event', async (req, res) => {
    try {
        const db = client.db(dbName);
        const currentEventCollection = db.collection(currentEventCollectionName);
        const currentEvent = await currentEventCollection.findOne({});
        if (currentEvent) {
            res.json({ success: true, currentEvent: currentEvent.currentEvent });
        } else {
            res.json({ success: false, message: 'Current event not found' });
        }
    } catch (error) {
        console.error('Error fetching current event:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.post('/verify-user', async (req, res) => {
    const { username, lastName } = req.body;

    try {
        const db = client.db(dbName);
        const usersCollection = db.collection(usersCollectionName);
        const user = await usersCollection.findOne({ id: username, lastName: lastName });

        if (user) {
            if (user.id === '35589' && user.lastName === 'Laverty') {
                res.json({ success: true, name: user.name, isAdmin: true });
            } else {
                res.json({ success: true, name: user.name, isAdmin: false });
            }
        } else {
            res.status(401).json({ success: false, message: 'Invalid CGS ID or Last Name' });
        }
    } catch (error) {
        console.error('Error verifying user:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.post('/update-event', async (req, res) => {
    const { eventId } = req.body;

    try {
        const db = client.db(dbName);
        const eventsCollection = db.collection(eventsCollectionName);
        const event = await eventsCollection.findOne({ id: eventId });

        if (event) {
            const currentEventCollection = db.collection(currentEventCollectionName);
            const result = await currentEventCollection.updateOne(
                {},
                { $set: { currentEvent: event } },
                { upsert: true }
            );

            if (result.matchedCount > 0 || result.upsertedCount > 0) {
                res.json({ success: true, message: 'Current event updated successfully' });
            } else {
                console.error('Failed to update current event:', result);
                res.status(500).json({ success: false, message: 'Failed to update current event' });
            }
        } else {
            res.status(404).json({ success: false, message: 'Event not found' });
        }
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.get('/poll-options/:eventId', async (req, res) => {
    const { eventId } = req.params;

    try {
        const db = client.db(dbName);
        const pollOptionsCollection = db.collection(pollOptionsCollectionName);
        const eventOptions = await pollOptionsCollection.findOne({ event: eventId });

        if (eventOptions && eventOptions.options.length > 0) {
            res.json({ success: true, options: eventOptions.options });
        } else {
            res.json({ success: false, message: 'No poll options found for the current event' });
        }
    } catch (error) {
        console.error('Error fetching poll options:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.get('/user/:username', async (req, res) => {
    const { username } = req.params;

    try {
        const db = client.db(dbName);
        const usersCollection = db.collection(usersCollectionName);
        const user = await usersCollection.findOne({ id: username });

        if (user) {
            res.json({ success: true, user });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.post('/vote', async (req, res) => {
    const { eventId, optionId, username } = req.body;

    try {
        const db = client.db(dbName);
        const votesCollection = db.collection('votes');
        const usersCollection = db.collection(usersCollectionName);

        // Insert a new vote document into the votes collection
        const result = await votesCollection.insertOne({ eventId, optionId });
        console.log('Insert result:', result);
        
        if (result.acknowledged && result.insertedId) {
            // Increment the vote count for the corresponding poll option in the poll options collection
            const pollOptionsCollection = db.collection('count');
            const eventDocument = await pollOptionsCollection.findOne({ eventId: eventId });
            console.log('Event document:', eventDocument);

            if (!eventDocument) {
                // If event document does not exist, create it
                const insertResult = await pollOptionsCollection.insertOne({
                    eventId: eventId,
                    options: [{ optionId: optionId, votes: 1 }]  
                });
                console.log('Insert result for event:', insertResult);
            } else { 
                // If the event document does exist, check if option exists
                const optionExists = eventDocument.options.some(option => option.optionId === optionId);
                console.log('Option exists:', optionExists);

                if (!optionExists) {
                    // If option doesn't exist, add it with vote count
                    const updateResult = await pollOptionsCollection.updateOne(
                        { eventId: eventId },
                        { $push: { options: { optionId: optionId, votes: 1 } } }
                    );
                    console.log('Update result for adding option:', updateResult);
                } else {
                    // If option exists, increment vote count
                    const updateResult = await pollOptionsCollection.updateOne(
                        { eventId: eventId, 'options.optionId': optionId },
                        { $inc: { 'options.$.votes': 1 } }
                    );
                    console.log('Update result for incrementing votes:', updateResult);
                }
            }

            // Update the user's boolean value for the event
            const updateUserResult = await usersCollection.updateOne(
                { id: username },
                { $set: { [eventId]: true } }
            );
            console.log('Update result for user:', updateUserResult);

            res.json({ success: true, message: 'Vote submitted successfully' });
        } else {
            console.error('Failed to insert vote document');
            res.status(500).json({ success: false, message: 'Failed to insert vote document' });
        }
    } catch (error) {
        console.error('Error submitting vote:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.get('/votes/:eventId', async (req, res) => {
    const { eventId } = req.params;

    try {
        const db = client.db(dbName);
        const pollOptionsCollection = db.collection('count');
        const eventOptions = await pollOptionsCollection.findOne({ eventId });

        if (eventOptions && eventOptions.options.length > 0) {
            res.json({ success: true, options: eventOptions.options });
        } else {
            res.json({ success: false, message: 'No poll options found for the current event' });
        }
    } catch (error) {
        console.error('Error fetching poll options:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

const axios = require('axios'); 

async function getPublicIp() {
    try {
        const response = await axios.get('https://ifconfig.me/ip');
        return response.data.trim();
    } catch (error) {
        console.error('Error fetching public IP:', error);
        return null;
    }
}

// SSL certificate and private key
const privateKey = fs.readFileSync(path.join(__dirname, 'privateKey.key'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'certificate.crt'), 'utf8');
const credentials = { key: privateKey, cert: certificate };

const httpsServer = https.createServer(credentials, app);

getPublicIp().then(publicIp => {
    if (publicIp) {
        console.log(`Server is running on https://${publicIp}:${port}`);
    } else {
        console.log(`Server is running on https://localhost:${port}`);
    }
});

httpsServer.listen(port);
