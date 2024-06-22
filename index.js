const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');
require("dotenv").config();
const jwt = require('jsonwebtoken');
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
    const requestCollection = client.db("bloodWave").collection("requests");
    const blogsCollection = client.db("bloodWave").collection("blogs");

    // JWT related Api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // Middlewares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
      })
    }


    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }
    const verifyVolunteer = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isVolunteer = user.role === 'volunteer';
      if (!isVolunteer) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
  }

    // district and upazila api
    app.get("/districts", async (req, res) => {
        const query = {};
        const cursor = districtCollection.find(query);
        const districts = await cursor.toArray();
        res.send(districts);
    })

    app.get("/districts/:id", async (req, res) => {
        const id = req.params.id;
        const query = { id: id };
        const district = await districtCollection.findOne(query);
        res.send(district);
    })

    app.get("/upazilas", async (req, res) => {
        const id = req.query?.id;
        let query = {};
        if (id) {
            query = { district_id: id };
        }
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

    app.get("/all-users", async (req, res) => {
        const query = {};
        const users = await userCollection.find(query).toArray();
        res.send(users);
    })

    app.patch("/users", async (req, res) => {
        const email = req.query?.email;
        const query = { email: email };
        const user = req.body;
        const option = { upsert: true };
        const updatedUser = {
            $set: user
        }
        const result = await userCollection.updateOne(query, updatedUser, option);
        res.send(result);
    })

    // make admin  api
    app.patch("/users/admin/:id", async (req, res) => {
        const id = req.params.id;
        console.log(id);
        const query = { _id: new ObjectId(id) };
        const user = req.body;
        const option = { upsert: true };
        const updatedUser = {
            $set: user
        }
        const result = await userCollection.updateOne(query, updatedUser, option);
        res.send(result);
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin  });
  })

  app.get('/users/volunteer/:email', verifyToken, verifyVolunteer, async (req, res) => {
    const email = req.params.email;
    if (email !== req.decoded.email) {
      return res.status(403).send({ message: 'forbidden access' });
    }
    const query = { email: email };
    const user = await userCollection.findOne(query);
    let volunteer = false;
    if (user) {
      volunteer = user?.role === 'volunteer';
    }
    res.send({ volunteer  });
  })




    // request api
    
    app.post("/requests", async (req, res) => {
        const request = req.body;
        console.log(request);
        const result = await requestCollection.insertOne(request);
        res.send(result);
    })

    app.get("/requests", async (req, res) => {
        const email = req.query?.email;
        const filter = req.query?.status;
        if(!filter){
            const query = { requesterEmail: email };
            const requests = await requestCollection.find(query).toArray();
            res.send(requests);
        }
        else{
          const query = { requesterEmail: email , status: filter }; 

        const requests = await requestCollection.find(query).toArray();
        res.send(requests);

        }
        
    })

    app.get("/request/:id", async (req, res) => {
        const id = req.params.id;
        console.log(id);
        const query = { _id: new ObjectId(id) };
        const request = await requestCollection.findOne(query);
        res.send(request);
    })

    app.patch("/request/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const request = req.body;
        const option = { upsert: true };
        const updatedRequest = {
          $set: request
        }
        const result = await requestCollection.updateOne(query, updatedRequest, option);
        res.send(result);
    })

    app.delete("/request/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await requestCollection.deleteOne(query);
        res.send(result);
    })

    app.get("/all-requests",verifyToken, (verifyAdmin || verifyVolunteer), async (req, res) => {
      const filter = req.query?.status;
        if(!filter){
            const query = { };
            const requests = await requestCollection.find(query).toArray();
            res.send(requests);
        }
        else{
          const query = { status: filter }; 

        const requests = await requestCollection.find(query).toArray();
        res.send(requests);

        }
        
    })


    //stats api
    app.get("/stats",verifyToken, (verifyAdmin || verifyVolunteer), async (req, res) => {
      const query = { role: "donor" };
      const count = await userCollection.countDocuments(query);

      const requests = await requestCollection.estimatedDocumentCount();
      res.send({ users: count, requests: requests });
    })

    //blog api
    app.post("/blogs", async (req, res) => {
        const blog = req.body;
        console.log(blog);
        const result = await blogsCollection.insertOne(blog);
        res.send(result);
    })

    app.get("/blogs", async (req, res) => {
        const query = {};
        const cursor = blogsCollection.find(query);
        const blogs = await cursor.toArray();
        res.send(blogs);
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