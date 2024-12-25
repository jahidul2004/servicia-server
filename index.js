const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(
    cors({
        origin: ["http://localhost:5173"],
        credentials: true,
    })
);
app.use(cookieParser());

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;

    if (!token) {
        res.status(401).send({ message: "Unauthorized" });
        return;
    }
    jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
        if (error) {
            res.status(401).send({ message: "Unauthorized" });
            return;
        }

        req.user = decoded;
        next();
    });
};

// Atlas connection

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
        const reviewCollection = database.collection("reviews");
        const userCollection = database.collection("users");

        // Auth related routes

        app.post("/jwt", async (req, res) => {
            const user = req.body;

            const token = jwt.sign(user, process.env.JWT_SECRET, {
                expiresIn: "1h",
            });

            res.cookie("token", token, {
                httpOnly: true,
                secure: false,
            });
            res.send({ success: true });
        });

        // Create router for add services
        app.post("/addService", async (req, res) => {
            const service = req.body;
            const result = await serviceCollection.insertOne(service);
            res.send(result);
        });

        // Create route for delete services
        app.delete("/deleteService/:id", async (req, res) => {
            const id = req.params.id;
            const result = await serviceCollection.deleteOne({
                _id: new ObjectId(id),
            });
            res.send(result);
        });

        // Create router for update services
        app.put("/updateService/:id", async (req, res) => {
            const id = req.params.id;
            const updatedService = req.body;
            const result = await serviceCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedService }
            );
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

        // Create router for get service by id
        app.get("/service/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const service = await serviceCollection.findOne({
                    _id: new ObjectId(id),
                });
                res.send(service);
            } catch (error) {
                console.error("Error fetching service:", error);
                res.status(500).send({ message: "Error fetching service" });
            }
        });

        // Create router for add reviews post
        app.post("/addReview", async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        });

        // Create router for get reviews by id
        app.get("/reviews/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const reviews = await reviewCollection
                    .find({
                        id: id,
                    })
                    .toArray();
                res.send(reviews);
            } catch (error) {
                console.error("Error fetching reviews:", error);
                res.status(500).send({ message: "Error fetching reviews" });
            }
        });

        // Create router for get all reviews
        app.get("/allReviews", async (req, res) => {
            try {
                const reviews = await reviewCollection.find({}).toArray();
                res.send(reviews);
            } catch (error) {
                console.error("Error fetching reviews:", error);
                res.status(500).send({ message: "Error fetching reviews" });
            }
        });

        // Create router for get reviews by email
        app.get("/myReviews/:email", verifyToken, async (req, res) => {
            const paramsEmail = req.params.email;

            if (paramsEmail !== req.user.user.email) {
                res.status(403).send({ message: "Unauthorized Forbidden" });
                return;
            }

            const reviews = await reviewCollection
                .find({
                    email: paramsEmail,
                })
                .toArray();
            res.send(reviews);
        });

        // Create router for delete reviews by email and id
        app.delete(
            "/deleteReview/:email/:id",
            verifyToken,

            async (req, res) => {
                const email = req.params.email;

                if (email !== req.user.user.email) {
                    res.status(403).send({ message: "Unauthorized Forbidden" });
                    return;
                }
                const id = req.params.id;
                const result = await reviewCollection.deleteOne({
                    email: email,
                    id: id,
                });
                res.send(result);
            }
        );

        // Create router for update reviews
        app.put("/updateReview/:id", async (req, res) => {
            const id = req.params.id;
            const updatedReview = req.body;
            const result = await reviewCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedReview }
            );
            res.send(result);
        });

        // Create router for get services by email
        app.get("/services/:email", async (req, res) => {
            try {
                const email = req.params.email;
                const services = await serviceCollection
                    .find({
                        serviceCreator: email,
                    })
                    .toArray();
                res.send(services);
            } catch (error) {
                console.error("Error fetching services:", error);
                res.status(500).send({ message: "Error fetching services" });
            }
        });

        // create route for document count
        app.get("/countData", async (req, res) => {
            const serviceCount = await serviceCollection.countDocuments({});
            const reviewCount = await reviewCollection.countDocuments({});
            const userCount = await userCollection.countDocuments({});

            const countedData = {
                serviceCount,
                reviewCount,
                userCount,
            };
            res.send(countedData);
        });

        // Create router for add users
        // Check if user already exists
        app.post("/addUser", async (req, res) => {
            const user = req.body;
            const existingUser = await userCollection.findOne({
                email: user.email,
            });
            if (existingUser) {
                res.status(400).send({ message: "User already exists" });
                return;
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
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
