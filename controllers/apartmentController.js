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
    const { role, _id: userId } = req.user;
    const { id } = req.params;

    // Only OWNER and MANAGER can update apartments
    if (!["OWNER", "MANAGER"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update apartments."
      });
    }

    const apartment = await Apartment.findById(id);

    if (!apartment) {
      return res.status(404).json({
        success: false,
        message: "Apartment not found."
      });
    }

    // Only allow these fields to be edited through this endpoint.
    // Managers cannot directly change approval, activity or status fields.
    const allowedFields = [
      "name",
      "description",
      "apartmentType",
      "pricePerNight",
      "capacity",
      "amenities"
    ];

    const changes = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        changes[field] = req.body[field];
      }
    }

    if (Object.keys(changes).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid apartment changes were provided."
      });
    }

    // Validate and normalize submitted values
    if (changes.name !== undefined) {
      if (
        typeof changes.name !== "string" ||
        !changes.name.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Apartment name is required."
        });
      }

      changes.name = changes.name.trim();

      const existingApartment = await Apartment.findOne({
        name: changes.name,
        _id: { $ne: apartment._id }
      });

      if (existingApartment) {
        return res.status(409).json({
          success: false,
          message: "Another apartment already uses this name."
        });
      }
    }

    if (changes.description !== undefined) {
      if (
        typeof changes.description !== "string" ||
        !changes.description.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Description is required."
        });
      }

      changes.description = changes.description.trim();
    }

    if (changes.pricePerNight !== undefined) {
      const price = Number(changes.pricePerNight);

      if (!Number.isFinite(price) || price < 1) {
        return res.status(400).json({
          success: false,
          message: "Price per night must be greater than zero."
        });
      }

      changes.pricePerNight = price;
    }

    if (changes.capacity !== undefined) {
      const capacity = Number(changes.capacity);

      if (!Number.isInteger(capacity) || capacity < 1) {
        return res.status(400).json({
          success: false,
          message: "Capacity must be a positive whole number."
        });
      }

      changes.capacity = capacity;
    }

    if (changes.apartmentType !== undefined) {
      const validTypes = [
        "STANDARD",
        "DELUXE",
        "EXECUTIVE",
        "SUITE",
        "PRESIDENTIAL"
      ];

      if (!validTypes.includes(changes.apartmentType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid apartment type."
        });
      }
    }

    if (changes.amenities !== undefined) {
      if (
        !Array.isArray(changes.amenities) ||
        !changes.amenities.every(
          item => typeof item === "string"
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Amenities must be an array of strings."
        });
      }

      changes.amenities = changes.amenities.map(
        item => item.trim()
      );
    }

    // MANAGER: save proposed changes for OWNER approval
    if (role === "MANAGER") {
      if (apartment.pendingUpdate) {
        return res.status(409).json({
          success: false,
          message:
            "This apartment already has an update awaiting owner approval."
        });
      }

      apartment.pendingUpdate = {
        changes,
        submittedBy: userId,
        submittedAt: new Date()
      };

      await apartment.save();

      return res.status(200).json({
        success: true,
        message:
          "Apartment update submitted successfully and is awaiting owner approval.",
        apartment
      });
    }

    // OWNER: apply changes immediately
    for (const [field, value] of Object.entries(changes)) {
      apartment.set(field, value);
    }

    await apartment.save();

    return res.status(200).json({
      success: true,
      message: "Apartment updated successfully.",
      apartment
    });

  } catch (error) {
    console.error("Update apartment error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An apartment with this name or code already exists."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update apartment."
    });
  }
};

export const approveApartmentUpdate = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only the owner can approve apartment updates."
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

    if (!apartment.pendingUpdate) {
      return res.status(400).json({
        success: false,
        message: "No pending update found for this apartment."
      });
    }

    const { changes } = apartment.pendingUpdate;

    // Check that the proposed name is still available
    if (changes.name !== undefined) {
      const existingApartment = await Apartment.findOne({
        name: changes.name,
        _id: { $ne: apartment._id }
      });

      if (existingApartment) {
        return res.status(409).json({
          success: false,
          message:
            "The proposed apartment name is already in use. The pending update has not been applied."
        });
      }
    }

    // Apply the manager's approved changes
    for (const [field, value] of Object.entries(changes)) {
      apartment.set(field, value);
    }

    // Clear the pending request
    apartment.pendingUpdate = null;

    await apartment.save();

    return res.status(200).json({
      success: true,
      message: "Apartment update approved successfully.",
      apartment
    });

  } catch (error) {
    console.error("Approve apartment update error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve apartment update."
    });
  }
};

export const rejectApartmentUpdate = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only the owner can reject apartment updates."
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

    if (!apartment.pendingUpdate) {
      return res.status(400).json({
        success: false,
        message: "No pending update found for this apartment."
      });
    }

    // Discard the proposed changes without changing live details
    apartment.pendingUpdate = null;

    await apartment.save();

    return res.status(200).json({
      success: true,
      message: "Apartment update rejected successfully.",
      apartment
    });

  } catch (error) {
    console.error("Reject apartment update error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject apartment update."
    });
  }
};

export const getPendingApartmentUpdates = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only the owner can view pending apartment updates."
      });
    }

    const apartments = await Apartment.find({
      "pendingUpdate.changes": { $exists: true }
    })
      .populate(
        "pendingUpdate.submittedBy",
        "fullName email role staffCode"
      )
      .sort({ "pendingUpdate.submittedAt": -1 });

    return res.status(200).json({
      success: true,
      count: apartments.length,
      apartments
    });

  } catch (error) {
    console.error("Get pending apartment updates error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending apartment updates."
    });
  }
};



export const deleteApartment = async (req, res) => {
  try {
    const { role, _id: userId } = req.user;
    const { id } = req.params;

    if (!["OWNER", "MANAGER"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete apartments.",
      });
    }

    const apartment = await Apartment.findById(id);

    if (!apartment) {
      return res.status(404).json({
        success: false,
        message: "Apartment not found.",
      });
    }

    // MANAGER: submit deletion request for OWNER approval.
    if (role === "MANAGER") {
      if (apartment.pendingDeletion?.requestedAt) {
        return res.status(409).json({
          success: false,
          message:
            "This apartment already has a pending deletion request.",
        });
      }

      apartment.pendingDeletion = {
        requestedBy: userId,
        requestedAt: new Date(),
      };

      await apartment.save();

      return res.status(200).json({
        success: true,
        message:
          "Deletion request submitted successfully and is awaiting owner approval.",
        apartment,
      });
    }

    // OWNER: prevent deletion only when there are upcoming
    // or ongoing bookings.
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const activeBookings = await Booking.find({
      apartment: apartment._id,
      bookingStatus: {
        $in: ["PENDING", "CONFIRMED", "CHECKED_IN"],
      },
      checkOutDate: {
        $gt: today,
      },
    }).select(
      "_id bookingReference customer bookingStatus paymentStatus checkInDate checkOutDate createdAt"
    );

    if (activeBookings.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This apartment has upcoming or ongoing bookings and cannot be deleted.",
        activeBookings,
      });
    }

    // Delete images from Cloudinary.
    if (apartment.images?.length) {
      for (const image of apartment.images) {
        if (!image.publicId) continue;

        try {
          await cloudinary.uploader.destroy(image.publicId);
        } catch (error) {
          console.error(
            `Failed to delete Cloudinary image ${image.publicId}:`,
            error
          );
        }
      }
    }

    await Apartment.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Apartment and its images deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Apartment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process apartment deletion.",
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


export const getPendingApartmentDeletions = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only the owner can view pending deletion requests.",
      });
    }

    const apartments = await Apartment.find({
      "pendingDeletion.requestedAt": { $exists: true },
    })
      .populate("pendingDeletion.requestedBy", "fullName email role staffCode")
      .sort({ "pendingDeletion.requestedAt": -1 });

    return res.status(200).json({
      success: true,
      count: apartments.length,
      apartments,
    });
  } catch (error) {
    console.error("Get pending apartment deletions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending deletion requests.",
    });
  }
};

export const approveApartmentDeletion = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only the owner can approve apartment deletions.",
      });
    }

    const apartment = await Apartment.findById(req.params.id);

    if (!apartment) {
      return res.status(404).json({
        success: false,
        message: "Apartment not found.",
      });
    }

    if (!apartment.pendingDeletion?.requestedAt) {
      return res.status(400).json({
        success: false,
        message: "No pending deletion request exists.",
      });
    }

    const bookings = await Booking.find({
      apartment: apartment._id,
      })
    .select("_id bookingReference bookingStatus paymentStatus checkIn checkOut")
    .lean();


    const terminalStatuses = [
      "CANCELLED",
      "CHECKED_OUT",
      "EXPIRED",
    ];

    const activeBookings = bookings.filter(
      (booking) =>
        !terminalStatuses.includes(
          String(booking.bookingStatus || "").toUpperCase()
        )
    );



    if (activeBookings > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This apartment has active bookings. Resolve them before deleting it.",
      });
    }

    // Delete Cloudinary images only after approval.
    if (apartment.images?.length) {
      for (const image of apartment.images) {
        if (!image.publicId) continue;

        try {
          await cloudinary.uploader.destroy(image.publicId);
        } catch (error) {
          console.error(
            `Failed to delete Cloudinary image ${image.publicId}:`,
            error
          );
        }
      }
    }

    await Apartment.findByIdAndDelete(apartment._id);

    return res.status(200).json({
      success: true,
      message: "Apartment deletion approved and completed.",
    });
  } catch (error) {
    console.error("Approve apartment deletion error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve apartment deletion.",
    });
  }
};

export const rejectApartmentDeletion = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only the owner can reject apartment deletions.",
      });
    }

    const apartment = await Apartment.findById(req.params.id);

    if (!apartment) {
      return res.status(404).json({
        success: false,
        message: "Apartment not found.",
      });
    }

    if (!apartment.pendingDeletion?.requestedAt) {
      return res.status(400).json({
        success: false,
        message: "No pending deletion request exists.",
      });
    }

    apartment.pendingDeletion = undefined;
    await apartment.save();

    return res.status(200).json({
      success: true,
      message: "Apartment deletion request rejected.",
    });
  } catch (error) {
    console.error("Reject apartment deletion error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject apartment deletion.",
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