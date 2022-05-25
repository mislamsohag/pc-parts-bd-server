const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

//use middleware
app.use(cors());
app.use(express.json());


//according to mongodb connect by copy then input dynamacally DB User and DB Password from .env file
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_KEY}@cluster0.z8icn.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1
});

//according to documentation of mongodb
async function run() {
    try {
        await client.connect();
        const productsCollection = client.db('pcPartsBd').collection('products');

        app.get('/product', async (req, res) => {
            const cursor = productsCollection.find({});
            const products = await cursor.toArray();
            res.send(products);
        });

    } finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
});

app.listen(port, () => {
    console.log('DB Connected by', port)
})
