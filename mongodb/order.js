import mongoose from "mongoose";

export const connectDB = async (url) => {
    mongoose
        .connect(url)
        .then(() => console.log("MongoDB connected..."))
        .catch((err) => console.error("Error : Mongodb Server is not connected.."));
};





const customerSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        village: String,
        union: String,
        upazila: String,
        district: String,
        division: String,
        landmark: String,
        addressFull: String,
    },
    { _id: false }
);

const itemSchema = new mongoose.Schema(
    {
        color: String,
        qty: { type: Number, required: true },
        imageUrl: [String],
        _id: String, // variant id (your frontend sent this)
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },

        colorCode: String,
        selectedSize: String,

        s: Number,
        m: Number,
        l: Number,
        xl: Number,
        xxl: Number,
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        customerDetails: {
            type: customerSchema,
            required: true,
        },

        items: {
            type: [itemSchema],
            required: true,
        },

        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },

        imageUrl: {
            type: [String],
            default: [],
        },

        paymentMethod: {
            type: String,
            enum: ["cod", "online"],
            default: "cod",
        },

        status: {
            type: String,
            enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
            default: "pending",
        },

        note: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;