import Apartment from "../models/apartmentModel.js";
import cloudinary from "../config/cloudinary.js";
import Booking from "../models/bookingModel.js"

export const createApartment = async (req, res) => {
  try {
    const { role, _id: userId } = req.user;

    // Only OWNER and MANAGER can create apartments
    if (!["OWNER", "MANAGER"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to create apartments."
      });
    }

    const {
      name,
      description,
      apartmentType,
      pricePerNight,
      capacity,
      amenities
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !description ||
      !pricePerNight ||
      !capacity
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, description, price per night and capacity are required."
      });
    }

    // Check if apartment already exists
    const apartmentExists = await Apartment.findOne({
      name: name.trim()
    });

    if (apartmentExists) {
      return res.status(409).json({
        success: false,
        message: "Apartment name already exists."
      });
    }

    // Generate apartment code
    const lastApartment = await Apartment.findOne()
      .sort({ createdAt: -1 });

    let apartmentCode = "APT001";

    if (lastApartment?.apartmentCode) {
      const number = parseInt(
        lastApartment.apartmentCode.replace("APT", "")
      );

      apartmentCode = `APT${String(number + 1).padStart(3, "0")}`;
    }

    // Owner = automatically approved
    // Manager = requires owner approval
    const isOwner = req.user.role === "OWNER";

    const apartment = await Apartment.create({
      apartmentCode,
      name: name.trim(),
      description: description.trim(),
      apartmentType,
      pricePerNight: Number(pricePerNight),
      capacity: Number(capacity),
      amenities: amenities || [],

      createdBy: req.user._id,

      approvalStatus: isOwner
        ? "APPROVED"
        : "PENDING",

      isActive: isOwner,

      status: isOwner
        ? "AVAILABLE"
        : "INACTIVE"
    });

    return res.status(201).json({
      success: true,

      message: isOwner
        ? "Apartment created successfully."
        : "Apartment submitted successfully and is awaiting owner approval.",

      apartment
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to create apartment."
    });
  }
};

export const uploadApartmentImages = async (req, res) => {
  try {
    const { id } = req.params;

    const apartment = await Apartment.findById(id);

    if (!apartment) {
      return res.status(404).json({
        success: false,
        message: "Apartment not found."
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image."
      });
    }

    if (apartment.images.length + req.files.length > 15) {
      return res.status(400).json({
        success: false,
        message: "An apartment can only have a maximum of 15 images."
      });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "apartments"
      });

      uploadedImages.push({
        imageUrl: result.secure_url,
        publicId: result.public_id
      });
    }

    apartment.images.push(...uploadedImages);

    await apartment.save();

    return res.status(200).json({
      success: true,
      message: `${uploadedImages.length} image(s) uploaded successfully.`,
      images: apartment.images
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteApartmentImage = async (req, res) => {
  try {
    const { id, publicId } = req.params;

    const apartment = await Apartment.findById(id);

    if (!apartment) {
      return res.status(404).json({
        success: false,
        message: "Apartment not found.",
      });
    }

    const imageIndex = apartment.images.findIndex(
      (image) => image.publicId === publicId
    );

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Image not found.",
      });
    }

    const image = apartment.images[imageIndex];

    // Delete image from Cloudinary
    await cloudinary.uploader.destroy(
      image.publicId
    );

    // Remove image from MongoDB
    apartment.images.splice(imageIndex, 1);

    await apartment.save();

    return res.status(200).json({
      success: true,
      message: "Image deleted successfully.",
      images: apartment.images,
    });

  } catch (error) {
    console.error(
      "Delete Apartment Image Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllApartments = async (req, res) => {
  try {
    const apartments = await Apartment.find({isActive: true});

    return res.status(200).json({
      success: true,
      apartments
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getApartmentById = async (req, res) => {
  try {
    const apartment = await Apartment.findById(req.params.id);

    if (!apartment) {
      return res.status(404).json({
        success: false,
        message:
          "Apartment not found"
      });
    }

    return res.status(200).json({
      success: true,
      apartment
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateApartment = async (req, res) => {
  try {
    const apartment =
      await Apartment.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true
        }
      );

    if (!apartment) {
      return res.status(404).json({
        success: false,
        message:
          "Apartment not found"
      });
    }

    return res.status(200).json({
      success: true,
      apartment
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteApartment = async (req, res) => {
  try {
    const apartment = await Apartment.findById(req.params.id);

    if (!apartment) {
      return res.status(404).json({
        success: false,
        message: "Apartment not found",
      });
    }

    // Delete all images from Cloudinary
    if (apartment.images && apartment.images.length > 0) {
      for (const image of apartment.images) {
        if (image.publicId) {
          try {
            await cloudinary.uploader.destroy(
              image.publicId
            );
          } catch (cloudinaryError) {
            console.error(
              `Failed to delete image ${image.publicId} from Cloudinary:`,
              cloudinaryError
            );
          }
        }
      }
    }

    // Permanently delete apartment from MongoDB
    await Apartment.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message:
        "Apartment and all its images deleted successfully",
    });

  } catch (error) {
    console.error(
      "Delete Apartment Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// export const getAvailableApartments = async (req, res) => {
//   try {
//     const { checkIn, checkOut } = req.query;

//     if (!checkIn || !checkOut) {
//       return res.status(400).json({
//         success: false,
//         message: "checkIn and checkOut are required"
//       });
//     }

//     const checkInDate = new Date(checkIn);
//     const checkOutDate = new Date(checkOut);

//     if (checkInDate >= checkOutDate) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid date range"
//       });
//     }

//     // 1. find all conflicting bookings
//     const bookedApartmentIds = await Booking.find({
//       bookingStatus: {
//         $nin: ["CANCELLED", "CHECKED_OUT"]
//       },
//       checkInDate: {
//         $lt: checkOutDate
//       },
//       checkOutDate: {
//         $gt: checkInDate
//       }
//     }).distinct("apartment");

//     // 2. get available apartments
//     const availableApartments = await Apartment.find({
//       isActive: true,
//       _id: { $nin: bookedApartmentIds }
//     });

//     return res.status(200).json({
//       success: true,
//       count: availableApartments.length,
//       data: availableApartments
//     });

//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

//usefull for UI calendar
export const getAllApartmentsWithStatus = async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: "Check-in and check-out dates are required."
      });
    }

    const checkInDate = new Date(`${checkIn}T00:00:00.000Z`);
    const checkOutDate = new Date(`${checkOut}T00:00:00.000Z`);

    if (
      Number.isNaN(checkInDate.getTime()) ||
      Number.isNaN(checkOutDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid dates."
      });
    }

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({
        success: false,
        message: "Check-out date must be after check-in date."
      });
    }

    /*
      IMPORTANT:

      Booking intervals are treated as:

      [checkIn, checkOut)

      Therefore:

      Existing: 22 -> 23

      New:      21 -> 22   ✅ AVAILABLE
      New:      23 -> 24   ✅ AVAILABLE

      New:      22 -> 23   ❌ BOOKED
      New:      21 -> 23   ❌ BOOKED
      New:      22 -> 24   ❌ BOOKED
    */

    const bookings = await Booking.find({
      bookingStatus: {
        $nin: [
          "CANCELLED",
          "CHECKED_OUT",
          "EXPIRED"
        ]
      },

      checkInDate: {
        $lt: checkOutDate
      },

      checkOutDate: {
        $gt: checkInDate
      }
    }).select("apartment");

    const bookedApartmentIds = new Set(
      bookings.map(
        (booking) => booking.apartment.toString()
      )
    );

    const apartments = await Apartment.find({
      isActive: true,
      approvalStatus: "APPROVED",
      status: {
        $nin: [
          "MAINTENANCE",
          "INACTIVE"
        ]
      }
    });

    const result = apartments.map((apartment) => ({
      ...apartment.toObject(),

      isAvailable: !bookedApartmentIds.has(
        apartment._id.toString()
      )
    }));

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error(
      "Get apartments with status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const approveApartment = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only the owner can approve apartments."
      });
    }

    const { id } = req.params;

    const apartment = await Apartment.findById(id);

    if (!apartment) {
      return res.status(404).json({
        success: false,
        message: "Apartment not found."
      });
    }

    if (apartment.approvalStatus !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending apartments can be approved."
      });
    }

    apartment.approvalStatus = "APPROVED";
    apartment.isActive = true;
    apartment.status = "AVAILABLE";

    await apartment.save();

    return res.status(200).json({
      success: true,
      message: "Apartment approved successfully.",
      apartment
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve apartment."
    });
  }
};

export const rejectApartment = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only the owner can reject apartments."
      });
    }

    const { id } = req.params;

    const apartment = await Apartment.findById(id);

    if (!apartment) {
      return res.status(404).json({
        success: false,
        message: "Apartment not found."
      });
    }

    if (apartment.approvalStatus !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending apartments can be rejected."
      });
    }

    // Reject and permanently remove the apartment
    await Apartment.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Apartment rejected and deleted successfully."
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject apartment."
    });
  }
};

export const getPendingApartments = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only the owner can view pending apartments."
      });
    }

    const apartments = await Apartment.find({
      approvalStatus: "PENDING"
    })
      .populate(
        "createdBy",
        "fullName email role"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: apartments.length,
      apartments
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending apartments."
    });
  }
};

export const getApprovedApartments = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only the owner can view approved apartments."
      });
    }

    const apartments = await Apartment.find({
      approvalStatus: "APPROVED"
    })
      .populate("createdBy", "fullName email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: apartments.length,
      apartments
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch approved apartments."
    });
  }
};