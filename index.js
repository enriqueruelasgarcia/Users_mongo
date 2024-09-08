const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config({ path: 'sample.env' });

const app = express();

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Cadena de conexión de MongoDB
const mongoURI = process.env.MONGO_URI;
const client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

let db;
let userCollection;

client.connect()
    .then(() => {
        console.log('Connected to MongoDB');
        db = client.db('exerciseTracker'); // Cambia 'exerciseTracker' por el nombre de tu base de datos
        userCollection = db.collection('users');
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    });

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', async(req, res) => {
    if (!userCollection) return res.status(500).json({ error: 'Database not connected' });

    try {
        const newUser = {
            username: req.body.username,
            exercises: []
        };

        const result = await userCollection.insertOne(newUser);

        res.json({
            username: newUser.username,
            _id: result.insertedId
        });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ error: 'Error al crear el usuario' });
    }
});

app.post('/api/users/:_id/exercises', async(req, res) => {
    if (!userCollection) return res.status(500).json({ error: 'Database not connected' });

    const { _id } = req.params;
    const { description, duration, date } = req.body;

    const newExercise = {
        description,
        duration: parseInt(duration, 10),
        date: date ? new Date(date).toDateString() : new Date().toDateString(),
    };

    try {
        const updateResult = await userCollection.updateOne({ _id: new ObjectId(_id) }, { $push: { exercises: newExercise } });

        if (updateResult.matchedCount === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Fetch the updated user
        const user = await userCollection.findOne({ _id: new ObjectId(_id) });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            _id: user._id,
            username: user.username,
            description: newExercise.description,
            duration: newExercise.duration,
            date: newExercise.date
        });
    } catch (err) {
        console.error('Error adding exercise:', err);
        res.status(500).json({ error: 'Error al actualizar el ejercicio' });
    }
});


app.get('/api/users/:_id/logs', async(req, res) => {
    if (!userCollection) return res.status(500).json({ error: 'Database not connected' });

    const { _id } = req.params;
    const { from, to, limit } = req.query;

    try {
        const user = await userCollection.findOne({ _id: new ObjectId(_id) });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        let logs = user.exercises;

        if (from) {
            const fromDate = new Date(from);
            logs = logs.filter(exercise => new Date(exercise.date) >= fromDate);
        }
        if (to) {
            const toDate = new Date(to);
            logs = logs.filter(exercise => new Date(exercise.date) <= toDate);
        }

        if (limit) {
            logs = logs.slice(0, parseInt(limit, 10));
        }

        res.json({
            _id: user._id,
            username: user.username,
            count: logs.length,
            log: logs
        });
    } catch (err) {
        console.error('Error fetching logs:', err);
        res.status(500).json({ error: 'Error al obtener los registros' });
    }
});

app.get('/api/users', async(req, res) => {
    if (!userCollection) return res.status(500).json({ error: 'Database not connected' });

    try {
        const users = await userCollection.find({}, { projection: { username: 1, _id: 1 } }).toArray();
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port);
});