const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

//জট টোকেন ভেরিফাই করা
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized user access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

//Admin Verify করা
const verifyAdmin = async (req, res, next) => {
    const requester = req.decoded.email;
    const requesterAccount = await userCollection.findOne({ email: requester });
    if (requesterAccount.role === 'admin') {
        next();
    } else {
        res.status(403).send({ message: 'forbidden' });
    }
}


//according to documentation of mongodb
async function run() {
    try {
        await client.connect();
        const productsCollection = client.db('pcPartsBd').collection('products');
        const reviewsCollection = client.db('pcPartsBd').collection('reviews');
        const orderCollection = client.db('pcPartsBd').collection('orders');
        const userCollection = client.db('pcPartsBd').collection('users');

        //ইউজার তৈরি করার জন্য put করব কেননা আমি জানিনা ইউজার নতুন না পুরাতন
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: 60 * 60 })
            res.send({ result, token });
        })

        //সকল প্রোডাক্ট পেতে GET মেথড
        app.get('/product', async (req, res) => {
            const cursor = productsCollection.find({});
            const products = await cursor.toArray();
            res.send(products);
        });

        // ইউজারের reviews গুলে database-এ রাখতে এবং পূর্বে থাকলে তা বাধা দেয়ার জন্য POST মেথড
        app.post('/reviews', async (req, res) => {
            const reviews = req.body;
            const query = { id: reviews.productId, email: reviews.userEmail }
            const exists = await reviewsCollection.findOne(query)
            if (exists) {
                return res.send({ success: false, reviews: exists })
            }
            const result = await reviewsCollection.insertOne(reviews);
            return res.send({ success: true, result });
        });

        //এখন সকল reviews দেখানোর জন্য get method-এ কাজ করব।
        app.get('/review', async (req, res) => {
            const reviews = await reviewsCollection.find().toArray();
            res.send(reviews);
        })

        // ইউজারের অর্ডারগুলো database-এ রাখার জন্য
        app.post('/order', async (req, res) => {
            const order = req.body;
            const query = { id: order.productId, email: order.userEmail }
            const exists = await orderCollection.findOne(query)
            if (exists) {
                return res.send({ success: false, order: exists })
            }
            const result = await orderCollection.insertOne(order);
            return res.send({ success: true, result });
        });


        //একজন ইউজারের রিভিউ বা মাই রিভিউ দেখানোর জন্য
        app.get('review', async (req, res) => {
            const userEmail = req.query.userEmail;
            const query = { userEmail: userEmail };
            const reviews = await reviewsCollection.find(query).toArray.apply();
            res.send(reviews);
        })

        //পূর্বে পোস্ট করা কোন তথ্যকে পূর্ণ আপডেড করার জন্য
        app.put('/update-product/:id', async (req, res) => {
            const { id } = req.params; //params এ যা আছে তা ধরার জন্য
            const data = req.body; //body তে যা আছে তা ধরে data-য় রাখা
            const filter = { _id: ObjectId(id) };
            const updateDoc = { $set: data };
            const option = { upsert: true };
            const result = await productsCollection.updateOne(filter, updateDoc, option);
            res.send(result);
        });

        //কোন তথ্যকে delete করার জন্য
        app.delete('/delete-product/:id', async (req, res) => {
            const { id } = req.params; //params এ যা আছে তা ধরার জন্য           
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
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
