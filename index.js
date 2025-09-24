const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { queryController, createEmbedding } = require('./controller');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.post('/api/query', queryController);
app.post('/api/create-embedding', createEmbedding);

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log('Server running');
});