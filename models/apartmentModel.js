import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true
    },

    publicId: {
      type: String,
      required: true
    }
  },
  {
    _id: false
  }
);

const apartmentSchema = new mongoose.Schema(
  {
    apartmentCode: {
      type: String,
      unique: true,
      immutable: true
    },

    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    apartmentType: {
      type: String,
      enum: [
        "STANDARD",
        "DELUXE",
        "EXECUTIVE",
        "SUITE",
        "PRESIDENTIAL"
      ],
      default: "STANDARD"
    },

    pricePerNight: {
      type: Number,
      required: true,
      min: [1, "Price must be greater than zero"]
    },

    capacity: {
      type: Number,
      required: true,
      min: [1, "Capacity must be at least 1"]
    },

    amenities: [
      {
        type: String,
        trim: true
      }
    ],

    images: {
      type: [imageSchema],
      validate: {
        validator: function (images) {
          return images.length <= 15;
        },
        message: "Maximum of 15 images allowed."
      },
      default: []
    },

    status: {
      type: String,
      enum: [
        "AVAILABLE",
        "BOOKED",
        "OCCUPIED",
        "MAINTENANCE",
        "INACTIVE"
      ],
      default: "AVAILABLE"
    },

    approvalStatus: {
      type: String,
      enum: ["APPROVED", "PENDING", "REJECTED"],
      default: "APPROVED"
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Apartment = mongoose.model("Apartment", apartmentSchema);

export default Apartment;