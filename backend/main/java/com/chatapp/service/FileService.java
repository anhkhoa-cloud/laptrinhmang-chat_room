package com.chatapp.service;

import com.chatapp.model.File;
import com.chatapp.repository.FileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileService {
    @Autowired
    private FileRepository fileRepository;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public File saveFile(MultipartFile multipartFile, Long uploadedById) throws IOException {
        // Create upload directory if it doesn't exist
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Generate unique filename
        String originalFilename = multipartFile.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String storedName = UUID.randomUUID().toString() + extension;
        Path filePath = uploadPath.resolve(storedName);

        // Save file to disk
        Files.copy(multipartFile.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // Save file metadata to database
        File file = new File();
        file.setOriginalName(originalFilename);
        file.setStoredName(storedName);
        file.setFilePath(filePath.toString());
        file.setFileSize(multipartFile.getSize());
        file.setMimeType(multipartFile.getContentType());
        file.setUploadedById(uploadedById);

        return fileRepository.save(file);
    }

    public Resource loadFileAsResource(Long fileId) throws IOException {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));

        Path filePath = Paths.get(file.getFilePath());
        Resource resource = new UrlResource(filePath.toUri());

        if (resource.exists() && resource.isReadable()) {
            return resource;
        } else {
            throw new RuntimeException("File not found or not readable: " + fileId);
        }
    }

    public File getFile(Long fileId) {
        return fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));
    }
}


