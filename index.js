const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Atlas connection

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8eefy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!"
        );

        // Create a new database and collection

        const database = client.db("servicia");

        // Collections here
        const serviceCollection = database.collection("services");

        // Create router for add services
        app.post("/addService", async (req, res) => {
            const service = req.body;
            const result = await serviceCollection.insertOne(service);
            res.send(result);
        });

        // Create router for get services
        app.get("/services", async (req, res) => {
            try {
                // Get limit from URL query
                const limit = parseInt(req.query.limit) || 0;

                // Fetch services with the specified limit or all services
                const cursor = serviceCollection.find({});
                const services = await cursor.limit(limit).toArray();

                res.send(services);
            } catch (error) {
                console.error("Error fetching services:", error);
                res.status(500).send({ message: "Error fetching services" });
            }
        });
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

// Routes
app.get("/", async (req, res) => {
    res.send("Hello World");
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
