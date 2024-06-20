const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

//MongoDB connection


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hjxwn6k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    // Collections
    const districtCollection = client.db("bloodWave").collection("district");
    const upazilaCollection = client.db("bloodWave").collection("upazila");
    const userCollection = client.db("bloodWave").collection("users");

    // district and upazila api
    app.get("/districts", async (req, res) => {
        const query = {};
        const cursor = districtCollection.find(query);
        const districts = await cursor.toArray();
        res.send(districts);
    })

    app.get("/upazilas", async (req, res) => {
        const id = req.query?.id;
        const query = { district_id: id };
        const cursor = upazilaCollection.find(query);
        const upazilas = await cursor.toArray();
        res.send(upazilas);
        
    })

    // user api
    app.post("/users", async (req, res) => {
        const user = req.body;
        const result = await userCollection.insertOne(user);
        res.send(result);
    })

    app.get("/users", async (req, res) => {
        const email = req.query?.email;
        console.log(email);
        const query = { email: email };
        const users = await userCollection.findOne(query);
        res.send(users);
    })
    

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get("/", (req, res) => {
    res.send(`Blood Wave Server Running `);
});

app.listen(port, () => {
    console.log(`Blood Wave Server Running on port ${port}`);
})