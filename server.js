import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import path from "path";
import streamifier from "streamifier";
import { fileURLToPath } from "url";
import Product, { connectDB } from "./mongodb/models.js";
import Order from "./mongodb/order.js";

dotenv.config({
    path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env"),
});

connectDB(`${process.env.MONGO_URI}/yaqeen`);

const app = express();

// CORS middleware

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------- Cloudinary config -------------------
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ------------------- Multer (Memory Storage) -------------------
const storage = multer.memoryStorage(); // ✅ use memory storage
const upload = multer({ storage });

// ------------------- Helper: Upload buffer to Cloudinary -------------------
const uploadToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                format: "webp",
                quality: "auto:good",
                transformation: [
                    { fetch_format: "webp", quality: "auto:good", crop: "fit" },
                ],
            },
            (error, result) => {
                if (result) resolve(result.secure_url);
                else reject(error);
            },
        );

        streamifier.createReadStream(fileBuffer).pipe(stream);
    });
};


app.get("/orders", async (req, res) => {

    try{
        let orderIds = req.query.ids;
        if (!orderIds) {
            return res.json([]);
        }

        if(!Array.isArray(orderIds)){
            orderIds = [orderIds];
        }

        const orders = await Order.find({_id : orderIds})

        res.json(orders);
    }
    catch(err){
        console.error(err);
        res.status(500).json({error : "Faild to fetch orders"});
    }
    



})

app.post("/order", async (req, res) => {
    console.log("new order", req.body);
    try {
        const newOrder = new Order(req.body);
        // console.log("new Order =>", newOrder.items[0].productId);
        let order = await newOrder.save();
        res.json(order._id);
        // console.log("->>>",res);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Order failed" });
    }
});

app.delete("/products/:product_id", async (req, res) => {
    const { product_id } = req.params;
    try {
        const result = await Product.findByIdAndDelete(product_id);
        console.log(req.params.product_id, "\n ", result);
        if (!result) {
            throw new Error("product finding problem in product deleting path");
        }
        res.status(200).json("done");
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Delete failed" });
    }
});

app.delete("/products/:product_id/vars/:color", async (req, res) => {
    try {
        const { product_id, color } = req.params;

        const product = await Product.findByIdAndUpdate(
            product_id,
            {
                $pull: {
                    vars: { color },
                },
            },
            { new: true },
        );

        if (!product) {
            return res.status(404).json({
                message: "Product not found",
            });
        }

        return res.status(200).json({
            message: "Variant deleted successfully",
            product,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

app.post("/addcolor", upload.any(), async (req, res) => {
    console.log("adding color...");
    const files = req.files;
    const sizes = JSON.parse(req.body.sizes);
    // const product = await Product.findById(req.body._id);

    let imageUrls = [];
    if (files && files.length > 0) {
        for (const file of files) {
            const url = await uploadToCloudinary(file.buffer);
            imageUrls.push(url);
        }
    }

    const newVars = {
        color: req.body.color,
        colorCode: req.body.colorCode,
        s: sizes.s,
        m: sizes.m,
        l: sizes.l,
        xl: sizes.xl,
        xxl: sizes.xxl,
        pricing: req.body.pricing,
        imageUrl: imageUrls,
    };

    console.log(newVars);

    const updated = await Product.findByIdAndUpdate(
        req.body._id,
        { $push: { vars: newVars } },
        { new: true },
    );

    res.redirect("/admin/products");
});

app.post("/product", upload.array("images"), async (req, res) => {
    try {
        const body = req.body;
        const files = req.files;

        // Cloudinary upload

        const imageUrls = await Promise.all(
            files.map((file) => uploadToCloudinary(file.buffer)),
        );

        // let imageUrls = [];
        // if (files && files.length > 0) {
        //     for (const file of files) {
        //         const url = await uploadToCloudinary(file.buffer);
        //         imageUrls.push(url);
        //     }
        // }

        const product = new Product({
            title: body.title,
            description: body.description,
            category: body.category,
            subcategory: body.subcategory,
            pricing: Number(body.pricing),
            discountsPrice: Number(body.discountsPrice),
            discountsPercentage: Number(body.discountsPercentage),
            for: body.for,
            stock: Number(body.stock),
            images: imageUrls,
            vendor: body.vendor,
            rating: body.rating,
        });

        // const product2 = new Product({ ...body, images: imageUrls });

        if (!req.body.title || !req.body.pricing) {
            return res.status(400).json({ message: "Missing fields" });
        }
        await product.save();
        res.json({ message: "Product uploaded successfully" });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

app.get("/view/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const data = await Product.findById(id);
        const view = data.totalView;
        await Product.findByIdAndUpdate(id, { totalView: view + 1 });
    } catch (err) {
        res.status(500).json({
            error: "Single Product View increasing problem...",
        });
    }
});

app.get("/product/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const data = await Product.findById(id);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

app.get("/products", async (req, res) => {
    console.log("call products");
    try {
        const data = await Product.find({});
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

app.get("/no-sleep", async (req, res) => {
    res.json("ok");
});

// ------------------- Start Server -------------------
app.listen(8000, "0.0.0.0", () => {
    console.log("🚀 Server running on port 8000");
});
