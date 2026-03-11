import axios from 'axios';

const CLOUDINARY_TIMEOUT_MS = 60_000;

export const uploadFile = async (file: File, folder: string = 'uploads'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
  formData.append('folder', folder);
  formData.append('resource_type', 'auto');

  const res = await axios.post(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
    formData,
    { timeout: CLOUDINARY_TIMEOUT_MS }
  );
  return res.data.secure_url;
};

export const uploadPdf = async (pdfBlob: Blob, filename: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', pdfBlob, `${filename}.pdf`);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

  const res = await axios.post(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/upload`,
    formData,
    { timeout: 0 }
  );
  return res.data.secure_url;
};

export const uploadImage = uploadFile;
