const cloudinary = require("../config/cloudinary");

const uploadLocalFileToCloudinary = (filePath) =>
  cloudinary.uploader.upload(filePath, {
    resource_type: "auto",
    folder: "exampulse",
    use_filename: true,
    unique_filename: true,
  });

const destroyCloudinaryAsset = async (publicId, resourceType = "image") => {
  if (!publicId) {
    return;
  }

  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
};

module.exports = {
  uploadLocalFileToCloudinary,
  destroyCloudinaryAsset,
};
