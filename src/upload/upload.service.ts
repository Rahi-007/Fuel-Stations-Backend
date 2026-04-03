import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { configureCloudinary } from '../config/cloudinary.config';

export type CloudinaryUploadResponse = UploadApiResponse | UploadApiErrorResponse;

@Injectable()
export class UploadService {
  private cloudinaryInstance: typeof cloudinary;

  constructor(private configService: ConfigService) {
    this.cloudinaryInstance = configureCloudinary(configService);
  }

  async uploadSingleFile(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<CloudinaryUploadResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
    }

    // Validate file type (images only)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only image files (JPEG, PNG, GIF, WEBP) are allowed');
    }

    try {
      const uploadFolder = folder || this.configService.get<string>('CLOUDINARY_UPLOAD_FOLDER', 'stations');
      
      const result = await new Promise<CloudinaryUploadResponse>((resolve, reject) => {
        const uploadStream = this.cloudinaryInstance.uploader.upload_stream(
          {
            folder: uploadFolder,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result as CloudinaryUploadResponse);
            }
          },
        );

        uploadStream.end(file.buffer);
      });

      return result;
    } catch (error: any) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder?: string,
  ): Promise<CloudinaryUploadResponse[]> {
    const uploadPromises = files.map((file) => this.uploadSingleFile(file, folder));
    return Promise.all(uploadPromises);
  }

  async deleteFile(publicId: string): Promise<any> {
    try {
      const result = await this.cloudinaryInstance.uploader.destroy(publicId);
      return result;
    } catch (error: any) {
      throw new BadRequestException(`Delete failed: ${error.message}`);
    }
  }

  formatUploadResponse(uploadResult: CloudinaryUploadResponse) {
    if ('error' in uploadResult) {
      throw new BadRequestException(uploadResult.error.message);
    }

    return {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      bytes: uploadResult.bytes,
      createdAt: uploadResult.created_at,
    };
  }
}